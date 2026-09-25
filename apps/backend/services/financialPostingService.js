const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { round2 } = require('../utils/dentalLabHelpers');

/**
 * Valid Source Types for FinancialPostings
 */
const SOURCE_TYPES = {
  CASE_INVOICE: 'CASE_INVOICE',
  SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',
  TECHNICIAN_PAYOUT: 'TECHNICIAN_PAYOUT',
  CASE_BOM_CONSUMPTION: 'CASE_BOM_CONSUMPTION',
  CAPITAL_DEPOSIT: 'CAPITAL_DEPOSIT',
  EXPENSE: 'EXPENSE',
  OUTSOURCE_EXPENSE: 'OUTSOURCE_EXPENSE',
};

const POSTING_STATUS = {
  PENDING_CONFIRM: 'PENDING_CONFIRM',
  POSTED: 'POSTED',
  VOID: 'VOID',
};

/**
 * Get company financial posting policy settings
 */
async function getFinancePolicy(prisma, companyId) {
  try {
    const settingRow = await prisma.dentalSetting.findFirst({
      where: { companyId, key: 'labPolicies' },
    });
    const policies = settingRow?.value || {};
    const finance = policies.finance || {};

    return {
      caseInvoicePosting: finance.caseInvoicePosting || 'CONFIRM', // AUTO | CONFIRM | MANUAL
      supplierPaymentPosting: finance.supplierPaymentPosting || 'CONFIRM',
      technicianPayoutPosting: finance.technicianPayoutPosting || 'CONFIRM',
      bomStockConsumption: finance.bomStockConsumption || 'CONFIRM',
      outsourcePosting: finance.outsourcePosting || 'CONFIRM',
      requiredAccount: finance.requiredAccount || false,
      defaultTreasuryAccountId: finance.defaultTreasuryAccountId || null,
      autoEnabledAt: finance.autoEnabledAt ? new Date(finance.autoEnabledAt) : null,
    };
  } catch (err) {
    console.warn('Error reading finance policy, using CONFIRM defaults:', err.message);
    return {
      caseInvoicePosting: 'CONFIRM',
      supplierPaymentPosting: 'CONFIRM',
      technicianPayoutPosting: 'CONFIRM',
      bomStockConsumption: 'CONFIRM',
      outsourcePosting: 'CONFIRM',
      requiredAccount: false,
      defaultTreasuryAccountId: null,
      autoEnabledAt: null,
    };
  }
}

/**
 * Resolve effective posting mode with 7-day safety guard
 */
function resolvePostingMode(policy, sourceType, hasActiveTreasury) {
  let configuredMode = 'CONFIRM';
  if (sourceType === SOURCE_TYPES.CASE_INVOICE) configuredMode = policy.caseInvoicePosting;
  else if (sourceType === SOURCE_TYPES.SUPPLIER_PAYMENT) configuredMode = policy.supplierPaymentPosting;
  else if (sourceType === SOURCE_TYPES.TECHNICIAN_PAYOUT) configuredMode = policy.technicianPayoutPosting;
  else if (sourceType === SOURCE_TYPES.CASE_BOM_CONSUMPTION) configuredMode = policy.bomStockConsumption;
  else if (sourceType === SOURCE_TYPES.EXPENSE || sourceType === SOURCE_TYPES.OUTSOURCE_EXPENSE) configuredMode = policy.outsourcePosting;

  if (configuredMode === 'AUTO') {
    // Guard 1: AUTO financial posting requires active treasury account
    if (!hasActiveTreasury) {
      return { mode: 'CONFIRM', guardTriggered: 'NO_ACTIVE_TREASURY' };
    }

    // Guard 2: 7-day grace period guard: Any AUTO financial posting in the first 7 days runs as CONFIRM
    if (policy.autoEnabledAt) {
      const daysSinceAuto = (Date.now() - policy.autoEnabledAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAuto < 7) {
        return { mode: 'CONFIRM', guardTriggered: 'SEVEN_DAY_GRACE_PERIOD', daysRemaining: Math.ceil(7 - daysSinceAuto) };
      }
    }
  }

  return { mode: configuredMode || 'CONFIRM', guardTriggered: null };
}

/**
 * Resolve default treasury account for company
 */
async function resolveTreasuryAccount(prisma, companyId, requestedAccountId = null) {
  if (requestedAccountId) {
    const acc = await prisma.treasuryAccount.findFirst({
      where: { id: requestedAccountId, companyId, isActive: true },
    });
    if (acc) return acc;
  }

  // Check default account
  const defaultAcc = await prisma.treasuryAccount.findFirst({
    where: { companyId, isActive: true, isDefault: true },
  });
  if (defaultAcc) return defaultAcc;

  // Check any active cash/bank account
  return prisma.treasuryAccount.findFirst({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Idempotent financial posting creation or retrieval
 */
async function createOrGetFinancialPosting({
  companyId,
  sourceType,
  sourceId,
  treasuryAccountId = null,
  direction, // 'IN' | 'OUT'
  amount,
  reference = null,
  notes = null,
  metadata = null,
  userId = null,
}) {
  const prisma = getSharedPrismaClient();
  const numAmount = round2(Number(amount) || 0);
  if (numAmount <= 0) return null;

  // 1. Check existing posting for idempotency
  const existing = await prisma.financialPosting.findUnique({
    where: {
      companyId_sourceType_sourceId: {
        companyId,
        sourceType,
        sourceId: String(sourceId),
      },
    },
    include: { treasuryAccount: true },
  });

  if (existing) {
    return { posting: existing, created: false, isDuplicate: true };
  }

  // 2. Resolve policy & treasury account
  const policy = await getFinancePolicy(prisma, companyId);
  const treasuryAccount = await resolveTreasuryAccount(prisma, companyId, treasuryAccountId || policy.defaultTreasuryAccountId);
  const { mode, guardTriggered, daysRemaining } = resolvePostingMode(policy, sourceType, Boolean(treasuryAccount));

  const resolvedTreasuryAccountId = treasuryAccount?.id || null;

  // If mode is MANUAL, we don't post automatically, but register as PENDING_CONFIRM for audit
  const targetStatus = mode === 'AUTO' && resolvedTreasuryAccountId ? POSTING_STATUS.POSTED : POSTING_STATUS.PENDING_CONFIRM;

  const postingMeta = {
    ...(metadata || {}),
    configuredMode: mode,
    guardTriggered: guardTriggered || null,
    daysRemaining: daysRemaining || null,
  };

  // 3. Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check again inside transaction for strict race condition guard
    const raceCheck = await tx.financialPosting.findUnique({
      where: {
        companyId_sourceType_sourceId: {
          companyId,
          sourceType,
          sourceId: String(sourceId),
        },
      },
    });
    if (raceCheck) return { posting: raceCheck, created: false, isDuplicate: true };

    let treasuryTx = null;

    if (targetStatus === POSTING_STATUS.POSTED && resolvedTreasuryAccountId) {
      // Lock treasury account for update
      if (typeof tx.$queryRawUnsafe === 'function') {
        try {
          await tx.$queryRawUnsafe(`SELECT "id" FROM "treasury_accounts" WHERE "id" = $1 FOR UPDATE`, resolvedTreasuryAccountId);
        } catch (_) {}
      }

      const freshAccount = await tx.treasuryAccount.findUnique({ where: { id: resolvedTreasuryAccountId } });
      if (freshAccount) {
        const prevBal = Number(freshAccount.balance) || 0;
        const newBal = round2(direction === 'IN' ? prevBal + numAmount : prevBal - numAmount);

        await tx.treasuryAccount.update({
          where: { id: resolvedTreasuryAccountId },
          data: { balance: newBal },
        });

        treasuryTx = await tx.treasuryTransaction.create({
          data: {
            companyId,
            treasuryAccountId: resolvedTreasuryAccountId,
            amount: numAmount,
            type: direction === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL',
            runningBalance: newBal,
            referenceType: sourceType,
            referenceId: String(sourceId),
            description: reference || notes || `ترحيل مالي ${sourceType} #${sourceId}`,
            createdById: userId,
          },
        });
      }
    }

    const createdPosting = await tx.financialPosting.create({
      data: {
        companyId,
        sourceType,
        sourceId: String(sourceId),
        treasuryAccountId: resolvedTreasuryAccountId,
        direction,
        amount: numAmount,
        status: targetStatus,
        postedBy: targetStatus === POSTING_STATUS.POSTED ? userId : null,
        postedAt: targetStatus === POSTING_STATUS.POSTED ? new Date() : null,
        reference: reference || null,
        notes: notes || null,
        metadata: postingMeta,
      },
      include: { treasuryAccount: true },
    });

    return { posting: createdPosting, created: true, isDuplicate: false, treasuryTransaction: treasuryTx };
  });

  return result;
}

/**
 * Confirm a pending financial posting and apply to treasury
 */
async function confirmFinancialPosting(companyId, postingId, { treasuryAccountId = null, userId = null } = {}) {
  const prisma = getSharedPrismaClient();

  const posting = await prisma.financialPosting.findFirst({
    where: { id: postingId, companyId },
  });

  if (!posting) {
    const err = new Error('الحركة المالية غير موجودة');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (posting.status === POSTING_STATUS.POSTED) {
    return { posting, alreadyPosted: true };
  }

  if (posting.status === POSTING_STATUS.VOID) {
    const err = new Error('لا يمكن ترحيل حركة مالية ملغاة');
    err.code = 'ALREADY_VOID';
    throw err;
  }

  const accountId = treasuryAccountId || posting.treasuryAccountId;
  const treasuryAccount = await resolveTreasuryAccount(prisma, companyId, accountId);

  if (!treasuryAccount) {
    const err = new Error('يجب تحديد حساب خزينة نشط لإتمام الترحيل');
    err.code = 'NO_TREASURY_ACCOUNT';
    throw err;
  }

  const numAmount = Number(posting.amount) || 0;

  return prisma.$transaction(async (tx) => {
    // Lock treasury account
    if (typeof tx.$queryRawUnsafe === 'function') {
      try {
        await tx.$queryRawUnsafe(`SELECT "id" FROM "treasury_accounts" WHERE "id" = $1 FOR UPDATE`, treasuryAccount.id);
      } catch (_) {}
    }

    const freshAccount = await tx.treasuryAccount.findUnique({ where: { id: treasuryAccount.id } });
    const prevBal = Number(freshAccount.balance) || 0;
    const newBal = round2(posting.direction === 'IN' ? prevBal + numAmount : prevBal - numAmount);

    await tx.treasuryAccount.update({
      where: { id: treasuryAccount.id },
      data: { balance: newBal },
    });

    const treasuryTx = await tx.treasuryTransaction.create({
      data: {
        companyId,
        treasuryAccountId: treasuryAccount.id,
        amount: numAmount,
        type: posting.direction === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL',
        runningBalance: newBal,
        referenceType: posting.sourceType,
        referenceId: posting.sourceId,
        description: posting.reference || `تأكيد ترحيل مالي ${posting.sourceType} #${posting.sourceId}`,
        createdById: userId,
      },
    });

    const updatedPosting = await tx.financialPosting.update({
      where: { id: postingId },
      data: {
        treasuryAccountId: treasuryAccount.id,
        status: POSTING_STATUS.POSTED,
        postedBy: userId,
        postedAt: new Date(),
      },
      include: { treasuryAccount: true },
    });

    return { posting: updatedPosting, treasuryTransaction: treasuryTx };
  });
}

/**
 * Void/Reject a pending financial posting
 */
async function voidFinancialPosting(companyId, postingId, { reason = null, userId = null } = {}) {
  const prisma = getSharedPrismaClient();

  const posting = await prisma.financialPosting.findFirst({
    where: { id: postingId, companyId },
  });

  if (!posting) {
    const err = new Error('الحركة المالية غير موجودة');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (posting.status === POSTING_STATUS.POSTED) {
    const err = new Error('لا يمكن إلغاء حركة تم ترحيلها للخزينة بالفعل');
    err.code = 'CANNOT_VOID_POSTED';
    throw err;
  }

  const updated = await prisma.financialPosting.update({
    where: { id: postingId },
    data: {
      status: POSTING_STATUS.VOID,
      notes: reason ? `${posting.notes ? posting.notes + ' | ' : ''}سبب الرفض: ${reason}` : posting.notes,
      metadata: {
        ...(posting.metadata || {}),
        voidedBy: userId,
        voidedAt: new Date().toISOString(),
        voidReason: reason || null,
      },
    },
    include: { treasuryAccount: true },
  });

  return { posting: updated };
}

/**
 * Deduct BOM Stock and record financial consumption
 */
async function processCaseBOMConsumption(companyId, caseId, { stageName = null, userId = null } = {}) {
  const prisma = getSharedPrismaClient();

  const dentalCase = await prisma.dentalLabCase.findFirst({
    where: { id: caseId, companyId },
    include: {
      workType: {
        include: {
          boms: {
            include: { material: true },
          },
        },
      },
    },
  });

  if (!dentalCase || !dentalCase.workType || !dentalCase.workType.boms || dentalCase.workType.boms.length === 0) {
    return { consumed: false, reason: 'NO_BOM_FOUND', items: [] };
  }

  const unitsCount = Math.max(1, Number(dentalCase.unitsCount) || 1);
  const boms = dentalCase.workType.boms;
  const results = [];

  for (const bom of boms) {
    const requiredTotalUnits = (Number(bom.unitsRequired) || 1) * unitsCount;
    const sourceId = `BOM:${caseId}:${bom.id}:${stageName || 'DELIVER'}`;

    // Find stock lot with available remaining units (FIFO)
    const stock = await prisma.dentalMaterialStock.findFirst({
      where: {
        companyId,
        materialId: bom.materialId,
        isDepleted: false,
        remainingUnits: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const unitCost = stock ? Number(stock.unitCost) || 0 : Number(bom.estimatedCost) || Number(bom.material?.costPerUnit) || 0;
    const totalCost = round2(unitCost * requiredTotalUnits);

    let stockUpdated = null;
    if (stock) {
      const newRemaining = Math.max(0, stock.remainingUnits - requiredTotalUnits);
      const isDepleted = newRemaining <= 0;
      stockUpdated = await prisma.dentalMaterialStock.update({
        where: { id: stock.id },
        data: {
          remainingUnits: newRemaining,
          isDepleted,
          depletedAt: isDepleted ? new Date() : stock.depletedAt,
        },
      });
    }

    // Record material usage
    const usage = await prisma.dentalCaseMaterialUsage.create({
      data: {
        companyId,
        caseId,
        materialId: bom.materialId,
        stockId: stock?.id || null,
        lotNumber: stock?.lotNumber || null,
        materialName: bom.material?.name || 'خامة معمل',
        unitsUsed: requiredTotalUnits,
        costRecorded: totalCost,
        notes: `استهلاك تلقائي BOM لحالة ${dentalCase.caseNumber} - ${bom.material?.name || ''}`,
        recordedBy: userId,
      },
    });

    // Post to financial layer (sourceType: CASE_BOM_CONSUMPTION, direction: OUT)
    const postingRes = await createOrGetFinancialPosting({
      companyId,
      sourceType: SOURCE_TYPES.CASE_BOM_CONSUMPTION,
      sourceId,
      direction: 'OUT',
      amount: totalCost,
      reference: `استهلاك خامات حالة ${dentalCase.caseNumber}`,
      notes: `خامة ${bom.material?.name} (${requiredTotalUnits} وحدة)`,
      metadata: {
        caseId,
        caseNumber: dentalCase.caseNumber,
        materialId: bom.materialId,
        usageId: usage.id,
        stageName,
      },
      userId,
    });

    results.push({
      materialId: bom.materialId,
      materialName: bom.material?.name,
      unitsRequired: requiredTotalUnits,
      stockUpdated: Boolean(stockUpdated),
      cost: totalCost,
      posting: postingRes?.posting,
    });
  }

  return { consumed: true, items: results };
}

/**
 * Generate comprehensive financial reports reading from the unified layer
 */
async function generateFinancialReports(prisma, companyId, { from = null, to = null } = {}) {
  const where = { companyId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  // 1. Postings
  const postings = await prisma.financialPosting.findMany({
    where,
    include: { treasuryAccount: true },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Active Treasury Accounts & Total Balance
  const accounts = await prisma.treasuryAccount.findMany({
    where: { companyId, isActive: true },
  });
  const totalTreasuryBalance = round2(accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));

  // 3. Cash Flow breakdown
  let totalReceipts = 0;
  let totalSupplierPayments = 0;
  let totalTechnicianPayouts = 0;
  let totalExpenses = 0;
  let totalBOMCost = 0;
  let totalPendingConfirm = 0;

  for (const p of postings) {
    const amt = Number(p.amount) || 0;
    if (p.status === POSTING_STATUS.PENDING_CONFIRM) {
      totalPendingConfirm += amt;
    }
    if (p.status === POSTING_STATUS.POSTED) {
      if (p.sourceType === SOURCE_TYPES.CASE_INVOICE || (p.direction === 'IN' && p.sourceType === SOURCE_TYPES.CAPITAL_DEPOSIT)) {
        totalReceipts += amt;
      } else if (p.sourceType === SOURCE_TYPES.SUPPLIER_PAYMENT) {
        totalSupplierPayments += amt;
      } else if (p.sourceType === SOURCE_TYPES.TECHNICIAN_PAYOUT) {
        totalTechnicianPayouts += amt;
      } else if (p.sourceType === SOURCE_TYPES.CASE_BOM_CONSUMPTION) {
        totalBOMCost += amt;
      } else if (p.sourceType === SOURCE_TYPES.EXPENSE || p.sourceType === SOURCE_TYPES.OUTSOURCE_EXPENSE) {
        totalExpenses += amt;
      }
    }
  }

  const netCashFlow = round2(totalReceipts - (totalSupplierPayments + totalTechnicianPayouts + totalExpenses));

  // 4. Receivables & Payables
  // Doctors outstanding balances
  const openInvoices = await prisma.dentalInvoice.findMany({
    where: { companyId, status: { in: ['OPEN', 'PARTIAL'] } },
    select: { remaining: true, total: true, paid: true, doctorId: true, doctorName: true },
  });
  const totalDoctorReceivables = round2(openInvoices.reduce((sum, inv) => sum + (Number(inv.remaining) || 0), 0));

  // Suppliers payables
  const suppliers = await prisma.supplier.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true, currentBalance: true, openingBalance: true },
  });
  const totalSupplierPayables = round2(suppliers.reduce((sum, s) => sum + (Number(s.currentBalance) || 0), 0));

  return {
    cashFlow: {
      totalReceipts: round2(totalReceipts),
      totalSupplierPayments: round2(totalSupplierPayments),
      totalTechnicianPayouts: round2(totalTechnicianPayouts),
      totalExpenses: round2(totalExpenses),
      totalBOMCost: round2(totalBOMCost),
      netCashFlow,
      totalTreasuryBalance,
      totalPendingConfirm: round2(totalPendingConfirm),
    },
    receivablesAndPayables: {
      doctorReceivables: totalDoctorReceivables,
      supplierPayables: totalSupplierPayables,
      netWorkingCapital: round2(totalDoctorReceivables - totalSupplierPayables),
    },
    treasuryAccounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: round2(Number(a.balance) || 0),
      isDefault: a.isDefault,
    })),
    postingsSummary: {
      totalCount: postings.length,
      postedCount: postings.filter((p) => p.status === POSTING_STATUS.POSTED).length,
      pendingCount: postings.filter((p) => p.status === POSTING_STATUS.PENDING_CONFIRM).length,
      voidCount: postings.filter((p) => p.status === POSTING_STATUS.VOID).length,
    },
  };
}

module.exports = {
  SOURCE_TYPES,
  POSTING_STATUS,
  getFinancePolicy,
  resolvePostingMode,
  resolveTreasuryAccount,
  createOrGetFinancialPosting,
  confirmFinancialPosting,
  voidFinancialPosting,
  processCaseBOMConsumption,
  generateFinancialReports,
};
