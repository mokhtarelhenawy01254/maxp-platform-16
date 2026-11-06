const { getSharedPrismaClient } = require('./sharedDatabase');

const serviceError = (message, statusCode, code) => {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const normalizeAmount = (val) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Calculates monthly earnings for a single courier:
 * - baseSalary: if compensationModel includes SALARY
 * - bonus: tiered (BONUS_TIERS) or bonusPerOrder * max(0, delivered - bonusStartsAfterOrders)
 * - commission: if compensationModel includes COMMISSION (from CourierCommission or per delivered order)
 * - deductions: shortages/damage deductions
 * - netPayable = baseSalary + bonus + commission - deductions
 */
function computeCompensation({
  deliveredCount = 0,
  compensationModel = 'COMMISSION_ONLY',
  salaryBase = 0,
  bonusPerOrder = 0,
  bonusStartsAfterOrders = 0,
  bonusTiers = null,
  commissionAmount = 0,
  totalCommissionsDue = 0,
  deductions = 0,
}) {
  const baseSalary = ['SALARY_ONLY', 'SALARY_PLUS_BONUS', 'SALARY_PLUS_COMMISSION'].includes(compensationModel)
    ? normalizeAmount(salaryBase)
    : 0;

  // 1. Bonus Calculation
  let bonus = 0;
  let parsedTiers = null;
  if (bonusTiers) {
    if (typeof bonusTiers === 'string') {
      try {
        parsedTiers = JSON.parse(bonusTiers);
      } catch (_) {}
    } else if (Array.isArray(bonusTiers)) {
      parsedTiers = bonusTiers;
    }
  }

  if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
    // Tiered calculation: e.g. [{from:1, to:50, amount:6}, {from:51, to:null, amount:8}]
    for (const tier of parsedTiers) {
      const from = Number(tier.from) || 1;
      const to = tier.to ? Number(tier.to) : Infinity;
      const rate = Number(tier.amount) || 0;
      if (deliveredCount >= from) {
        const eligibleInTier = Math.min(deliveredCount, to) - from + 1;
        if (eligibleInTier > 0) {
          bonus += eligibleInTier * rate;
        }
      }
    }
  } else if (normalizeAmount(bonusPerOrder) > 0) {
    // Threshold-based bonus: bonusPerOrder * max(0, deliveredCount - bonusStartsAfterOrders)
    const threshold = Number(bonusStartsAfterOrders) || 0;
    const eligibleCount = Math.max(0, deliveredCount - threshold);
    bonus = eligibleCount * normalizeAmount(bonusPerOrder);
  }

  // 2. Commission Calculation
  let commission = 0;
  if (['COMMISSION_ONLY', 'SALARY_PLUS_COMMISSION'].includes(compensationModel)) {
    if (totalCommissionsDue > 0) {
      commission = normalizeAmount(totalCommissionsDue);
    } else if (normalizeAmount(commissionAmount) > 0) {
      commission = deliveredCount * normalizeAmount(commissionAmount);
    }
  }

  const normalizedDeductions = normalizeAmount(deductions);
  const netPayable = Math.max(0, baseSalary + bonus + commission - normalizedDeductions);

  return {
    compensationModel,
    baseSalary,
    bonus,
    commission,
    deductions: normalizedDeductions,
    netPayable,
    deliveredCount,
  };
}

/**
 * Calculates earnings for a courier in a given month (YYYY-MM)
 */
async function calculateCourierMonthEarnings(companyId, courierId, month) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId },
  });
  if (!courier) {
    throw serviceError('المندوب غير موجود', 404, 'COURIER_NOT_FOUND');
  }

  // Parse Month Range
  const [yearStr, monthStr] = (month || '').split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (!year || !m || m < 1 || m > 12) {
    throw serviceError('صيغة الشهر غير صالحة، يجب أن تكون YYYY-MM', 400, 'INVALID_MONTH');
  }

  const startOfMonth = new Date(year, m - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, m, 1, 0, 0, 0, 0);

  // Delivered orders in that month
  const deliveredShipmentsCount = await prisma.shipment.count({
    where: {
      companyId,
      courierId,
      status: { in: ['DELIVERED', 'COMPLETED', 'REMITTED'] },
      updatedAt: { gte: startOfMonth, lt: endOfMonth },
    },
  });

  // Commissions earned in that month
  const commissions = await prisma.courierCommission.findMany({
    where: {
      companyId,
      courierId,
      createdAt: { gte: startOfMonth, lt: endOfMonth },
    },
    select: { amount: true },
  });
  const totalCommissionsDue = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const calc = computeCompensation({
    deliveredCount: deliveredShipmentsCount,
    compensationModel: courier.compensationModel || courier.commissionType || 'COMMISSION_ONLY',
    salaryBase: courier.salaryBase,
    bonusPerOrder: courier.bonusPerOrder,
    bonusStartsAfterOrders: courier.bonusStartsAfterOrders,
    bonusTiers: courier.bonusTiers,
    commissionAmount: courier.commissionAmount,
    totalCommissionsDue,
    deductions: 0,
  });

  return {
    courierId: courier.id,
    courierName: courier.name,
    month,
    ...calc,
  };
}

/**
 * Generates or updates the monthly payroll for all active couriers
 * POST /api/v1/couriers/payroll/run?month=YYYY-MM
 */
async function runMonthlyPayroll(companyId, month, userId) {
  const prisma = getSharedPrismaClient();

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw serviceError('صيغة الشهر مطلوبة بنسق YYYY-MM', 400, 'INVALID_MONTH');
  }

  // Guard against double payout: Check if ANY payroll for this month has already been PAID
  const existingPaid = await prisma.courierPayroll.findFirst({
    where: {
      companyId,
      month,
      status: 'PAID',
    },
  });

  if (existingPaid) {
    throw serviceError('تم صرف مسير رواتب هذا الشهر مسبقاً ولا يمكن إعادة تشغيله (409)', 409, 'PAYROLL_ALREADY_PAID');
  }

  // Fetch active couriers
  const couriers = await prisma.courier.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: 'asc' },
  });

  if (couriers.length === 0) {
    return { month, createdCount: 0, payrolls: [] };
  }

  const results = [];
  for (const courier of couriers) {
    const calc = await calculateCourierMonthEarnings(companyId, courier.id, month);

    const existing = await prisma.courierPayroll.findFirst({
      where: { companyId, courierId: courier.id, month },
    });

    let payroll;
    if (existing) {
      if (existing.status === 'PAID') {
        results.push(existing);
        continue;
      }
      payroll = await prisma.courierPayroll.update({
        where: { id: existing.id },
        data: {
          compensationModel: calc.compensationModel,
          baseSalary: calc.baseSalary,
          bonus: calc.bonus,
          commission: calc.commission,
          deductions: calc.deductions,
          netPayable: calc.netPayable,
          deliveredOrdersCount: calc.deliveredCount,
          calculationDetails: JSON.stringify(calc),
          updatedAt: new Date(),
        },
        include: { courier: { select: { id: true, name: true, phone: true, documentsStatus: true } } },
      });
    } else {
      payroll = await prisma.courierPayroll.create({
        data: {
          companyId,
          courierId: courier.id,
          month,
          compensationModel: calc.compensationModel,
          baseSalary: calc.baseSalary,
          bonus: calc.bonus,
          commission: calc.commission,
          deductions: calc.deductions,
          netPayable: calc.netPayable,
          deliveredOrdersCount: calc.deliveredCount,
          status: 'DRAFT',
          calculationDetails: JSON.stringify(calc),
        },
        include: { courier: { select: { id: true, name: true, phone: true, documentsStatus: true } } },
      });
    }
    results.push(payroll);
  }

  return {
    month,
    createdCount: results.length,
    payrolls: results,
  };
}

/**
 * List monthly payrolls
 * GET /api/v1/couriers/payroll?month=YYYY-MM
 */
async function listMonthlyPayroll(companyId, month) {
  const prisma = getSharedPrismaClient();

  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const payrolls = await prisma.courierPayroll.findMany({
    where: { companyId, month: targetMonth },
    include: {
      courier: {
        select: {
          id: true,
          name: true,
          phone: true,
          vehicleType: true,
          documentsStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = payrolls.reduce(
    (acc, p) => {
      acc.totalBaseSalary += Number(p.baseSalary || 0);
      acc.totalBonus += Number(p.bonus || 0);
      acc.totalCommission += Number(p.commission || 0);
      acc.totalDeductions += Number(p.deductions || 0);
      acc.totalNetPayable += Number(p.netPayable || 0);
      acc.totalDeliveredOrders += p.deliveredOrdersCount || 0;
      return acc;
    },
    {
      totalBaseSalary: 0,
      totalBonus: 0,
      totalCommission: 0,
      totalDeductions: 0,
      totalNetPayable: 0,
      totalDeliveredOrders: 0,
    }
  );

  return {
    month: targetMonth,
    totals,
    payrolls,
  };
}

/**
 * Approve a payroll record
 * POST /api/v1/couriers/payroll/:id/approve
 */
async function approvePayroll(companyId, payrollId, userId) {
  const prisma = getSharedPrismaClient();

  const payroll = await prisma.courierPayroll.findFirst({
    where: { id: payrollId, companyId },
    include: { courier: true },
  });

  if (!payroll) {
    throw serviceError('سجل المسير غير موجود', 404, 'PAYROLL_NOT_FOUND');
  }

  if (payroll.status === 'PAID') {
    throw serviceError('تم صرف هذا المسير بالفعل', 400, 'ALREADY_PAID');
  }

  const updated = await prisma.courierPayroll.update({
    where: { id: payrollId },
    data: {
      status: 'APPROVED',
      approvedBy: userId || 'SYSTEM',
      approvedAt: new Date(),
    },
    include: { courier: true },
  });

  return updated;
}

/**
 * Pay a payroll record with treasury deduction
 * POST /api/v1/couriers/payroll/:id/pay
 */
async function payPayroll(companyId, payrollId, { treasuryAccountId, notes } = {}, userId) {
  const prisma = getSharedPrismaClient();

  const payroll = await prisma.courierPayroll.findFirst({
    where: { id: payrollId, companyId },
    include: { courier: true },
  });

  if (!payroll) {
    throw serviceError('سجل المسير غير موجود', 404, 'PAYROLL_NOT_FOUND');
  }

  // Guard against double payout: "شهر واحد لا يُصرف مرتين (409)"
  if (payroll.status === 'PAID') {
    throw serviceError('شهر واحد لا يُصرف مرتين — تم صرف هذا المسير مسبقاً (409)', 409, 'ALREADY_PAID');
  }

  const netPayable = Number(payroll.netPayable || 0);

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve Treasury Account
    let account = null;
    if (treasuryAccountId) {
      account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId, isActive: true },
      });
    }

    if (!account) {
      account = await tx.treasuryAccount.findFirst({
        where: { companyId, isActive: true, isDefault: true },
      });
    }

    if (!account) {
      account = await tx.treasuryAccount.findFirst({
        where: { companyId, isActive: true },
      });
    }

    let treasuryTxId = null;
    if (account && netPayable > 0) {
      const newBalance = Number(account.balance) - netPayable;
      await tx.treasuryAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      const txRecord = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId: account.id,
          amount: -netPayable,
          type: 'EXPENSE',
          runningBalance: newBalance,
          referenceType: 'COURIER_PAYROLL',
          referenceId: payroll.id,
          description: `صرف مسير راتب مندوب [${payroll.courier.name}] لشهر ${payroll.month} (${notes || 'صرف نقدي'})`,
          date: new Date(),
          createdById: userId || null,
        },
      });
      treasuryTxId = txRecord.id;
    }

    // 2. Mark payroll as PAID
    const paidRecord = await tx.courierPayroll.update({
      where: { id: payrollId },
      data: {
        status: 'PAID',
        paidBy: userId || 'SYSTEM',
        paidAt: new Date(),
        treasuryAccountId: account ? account.id : null,
        treasuryTransactionId: treasuryTxId,
        notes: notes ? (payroll.notes ? `${payroll.notes} | ${notes}` : notes) : payroll.notes,
      },
      include: { courier: true },
    });

    return paidRecord;
  });
}

module.exports = {
  computeCompensation,
  calculateCourierMonthEarnings,
  runMonthlyPayroll,
  listMonthlyPayroll,
  approvePayroll,
  payPayroll,
};
