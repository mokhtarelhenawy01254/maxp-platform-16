/**
 * Company Wallet & Ledger Service (SHIP-T2)
 * Reference: Turbo Wallet & Transactions Ledger
 *
 * Models:
 * - CompanyWallet: companyId (unique) · balance · availableForRemittance · upcomingRemittance · currency · updatedAt
 * - CompanyWalletTransaction: companyId · type · reason · code · amount · balanceAfter · notes · createdBy · createdAt
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

function round(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

function serviceError(message, statusCode = 400, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

const REASON_LABELS_AR = {
  COD_COLLECTED: 'تحصيل COD',
  SETTLEMENT_PAYOUT: 'صرف كشف تسوية',
  PRINT_FEE: 'رسوم طباعة البوليصة',
  OPEN_PACKAGE_FEE: 'رسوم فتح الشحنة',
  ADJUSTMENT: 'تسوية رصيد يدوية',
  COMMISSION_PAYOUT: 'صرف عمولة',
};

const TYPE_LABELS_AR = {
  DEPOSIT: 'إيداع',
  WITHDRAW: 'سحب',
};

/**
 * Get or atomically create company wallet
 */
async function getOrCreateWallet(companyId, prismaClient = null) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  const prisma = prismaClient || getSharedPrismaClient();

  let wallet = await prisma.companyWallet.findUnique({
    where: { companyId },
  });

  if (!wallet) {
    wallet = await prisma.companyWallet.create({
      data: {
        companyId,
        balance: 0,
        availableForRemittance: 0,
        upcomingRemittance: 0,
        currency: 'EGP',
        totalSpent: 0,
        totalDeposited: 0,
      },
    });
  }

  return {
    ...wallet,
    balance: Number(wallet.balance || 0),
    availableForRemittance: Number(wallet.availableForRemittance || 0),
    upcomingRemittance: Number(wallet.upcomingRemittance || 0),
  };
}

/**
 * Recalculate upcomingRemittance from active ISSUED settlements
 */
async function recalculateUpcomingRemittance(companyId, prismaClient = null) {
  if (!companyId) return 0;
  const prisma = prismaClient || getSharedPrismaClient();

  const settlements = await prisma.shippingSettlement.findMany({
    where: {
      companyId,
      status: { in: ['ISSUED', 'APPROVED'] },
    },
    select: { netPayout: true },
  });

  const sum = settlements.reduce((acc, s) => acc + Number(s.netPayout || 0), 0);
  const rounded = round(sum);

  await prisma.companyWallet.updateMany({
    where: { companyId },
    data: { upcomingRemittance: rounded },
  });

  return rounded;
}

/**
 * Atomic transaction recording inside an active or new transaction
 */
async function recordTransaction({
  companyId,
  type, // DEPOSIT | WITHDRAW
  reason, // COD_COLLECTED | SETTLEMENT_PAYOUT | PRINT_FEE | OPEN_PACKAGE_FEE | ADJUSTMENT | COMMISSION_PAYOUT
  code = null, // shipment tracking / settlement number
  amount,
  notes = null,
  createdBy = null,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  const cleanType = String(type || '').toUpperCase();
  if (!['DEPOSIT', 'WITHDRAW'].includes(cleanType)) {
    throw serviceError(`نوع المعاملة غير صالح (${cleanType}) - يجب أن يكون DEPOSIT أو WITHDRAW`, 400);
  }

  const numAmount = round(amount);
  if (numAmount <= 0) {
    throw serviceError('قيمة المعاملة يجب أن تكون أكبر من صفر', 400);
  }

  const executeInTx = async (tx) => {
    // 1. Ensure wallet exists
    let wallet = await tx.companyWallet.findUnique({
      where: { companyId },
    });
    if (!wallet) {
      wallet = await tx.companyWallet.create({
        data: {
          companyId,
          balance: 0,
          availableForRemittance: 0,
          upcomingRemittance: 0,
          currency: 'EGP',
        },
      });
    }

    const currentBalance = Number(wallet.balance || 0);
    const currentAvailable = Number(wallet.availableForRemittance || 0);

    let newBalance = currentBalance;
    let newAvailable = currentAvailable;

    if (cleanType === 'DEPOSIT') {
      newBalance = round(currentBalance + numAmount);
      newAvailable = round(currentAvailable + numAmount);
    } else {
      newBalance = round(currentBalance - numAmount);
      newAvailable = round(currentAvailable - numAmount);
    }

    // Update wallet
    const updatedWallet = await tx.companyWallet.update({
      where: { companyId },
      data: {
        balance: newBalance,
        availableForRemittance: newAvailable,
        totalDeposited: cleanType === 'DEPOSIT' ? { increment: numAmount } : undefined,
        totalSpent: cleanType === 'WITHDRAW' ? { increment: numAmount } : undefined,
      },
    });

    // Create ledger transaction
    const transaction = await tx.companyWalletTransaction.create({
      data: {
        companyId,
        walletId: updatedWallet.id,
        type: cleanType,
        reason,
        code: code ? String(code).trim() : null,
        amount: numAmount,
        balanceAfter: newBalance,
        notes: notes ? String(notes).trim() : null,
        createdBy: createdBy ? String(createdBy) : null,
      },
    });

    return {
      wallet: {
        ...updatedWallet,
        balance: newBalance,
        availableForRemittance: newAvailable,
        upcomingRemittance: Number(updatedWallet.upcomingRemittance || 0),
      },
      transaction,
    };
  };

  if (prismaClient && typeof prismaClient.$transaction !== 'function') {
    // Already inside an interactive transaction
    return executeInTx(prismaClient);
  }

  const prisma = prismaClient || getSharedPrismaClient();
  return prisma.$transaction(executeInTx);
}

/**
 * Record COD collected for a delivered shipment
 * Acceptance 1: تحصيل 450 لشحنة -> balance يزيد 450 و availableForRemittance يزيد 450 + حركة COD_COLLECTED كود الشحنة
 */
async function recordCodCollected({
  companyId,
  shipmentId,
  trackingNumber,
  amount,
  createdBy = null,
  notes = null,
  prismaClient = null,
}) {
  const code = trackingNumber || shipmentId;
  const numAmount = round(amount);
  if (numAmount <= 0) return null;

  const prisma = prismaClient || getSharedPrismaClient();

  // Deduplication check: prevent duplicate collection crediting for same shipment code
  const existing = await prisma.companyWalletTransaction.findFirst({
    where: {
      companyId,
      reason: 'COD_COLLECTED',
      code,
    },
  });
  if (existing) {
    return { skipped: true, transaction: existing };
  }

  return recordTransaction({
    companyId,
    type: 'DEPOSIT',
    reason: 'COD_COLLECTED',
    code,
    amount: numAmount,
    notes: notes || `تحصيل مبلغ COD للشحنة ${code}`,
    createdBy,
    prismaClient,
  });
}

/**
 * Record Waybill Print Fee
 * Acceptance 2: طباعة بوليصة (رسوم 1.5) -> حركة PRINT_FEE −1.5؛ إعادة طباعة نفس الشحنة نفس اليوم -> لا خصم ثاني
 */
async function recordPrintFee({
  companyId,
  shipmentId,
  trackingNumber,
  template = 'WAYBILL',
  createdBy = null,
  prismaClient = null,
}) {
  const prisma = prismaClient || getSharedPrismaClient();
  const code = trackingNumber || shipmentId;

  // Resolve policy print fee
  let fee = 0;
  try {
    const policy = await prisma.shippingPolicySettings.findUnique({
      where: { companyId },
    });
    if (policy && policy.printFeePerWaybill != null) {
      fee = round(policy.printFeePerWaybill);
    }
  } catch (err) {
    fee = 0;
  }

  if (fee <= 0) {
    return { feeDeducted: false, skipped: true, fee: 0 };
  }

  // Deduplication: prevent duplicate print fee on same shipment on the same day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existingToday = await prisma.companyWalletTransaction.findFirst({
    where: {
      companyId,
      reason: 'PRINT_FEE',
      code,
      createdAt: { gte: startOfDay },
    },
  });

  if (existingToday) {
    return { feeDeducted: false, skipped: true, alreadyDeducted: true, fee, existingTransaction: existingToday };
  }

  const result = await recordTransaction({
    companyId,
    type: 'WITHDRAW',
    reason: 'PRINT_FEE',
    code,
    amount: fee,
    notes: `رسوم طباعة البوليصة (${template}) للشحنة ${code}`,
    createdBy,
    prismaClient,
  });

  return { feeDeducted: true, fee, ...result };
}

/**
 * Record Open Package Fee
 * Acceptance 4: وضع ASK_EACH برسوم 5: تأكيد فتح شحنة -> −5 + حركة بكود الشحنة
 */
async function recordOpenPackageFee({
  companyId,
  shipmentId,
  trackingNumber,
  fee = null,
  createdBy = null,
  notes = null,
  prismaClient = null,
}) {
  const prisma = prismaClient || getSharedPrismaClient();
  const code = trackingNumber || shipmentId;

  // Deduplication: prevent multiple OPEN_PACKAGE_FEE on same shipment
  const existing = await prisma.companyWalletTransaction.findFirst({
    where: {
      companyId,
      reason: 'OPEN_PACKAGE_FEE',
      code,
    },
  });
  if (existing) {
    return { feeDeducted: false, skipped: true, transaction: existing };
  }

  let finalFee = fee != null ? round(fee) : 0;
  if (finalFee <= 0) {
    const policy = await prisma.shippingPolicySettings.findUnique({
      where: { companyId },
    });
    if (policy?.openPackageFeeAsk != null) {
      finalFee = round(policy.openPackageFeeAsk);
    } else if (policy?.openPackageFeeAlways != null) {
      finalFee = round(policy.openPackageFeeAlways);
    }
  }

  if (finalFee <= 0) {
    return { feeDeducted: false, skipped: true, fee: 0 };
  }

  const result = await recordTransaction({
    companyId,
    type: 'WITHDRAW',
    reason: 'OPEN_PACKAGE_FEE',
    code,
    amount: finalFee,
    notes: notes || `رسوم فتح الشحنة بطلب العميل: ${code}`,
    createdBy,
    prismaClient,
  });

  return { feeDeducted: true, fee: finalFee, ...result };
}

/**
 * Record Settlement Statement Payout
 * Acceptance 3: كشف ISSUED صافي 230 -> upcomingRemittance 230; عند pay -> upcomingRemittance 0 و balance −230 + حركة SETTLEMENT_PAYOUT
 */
async function recordSettlementPayout({
  companyId,
  settlementId,
  settlementNumber,
  settlementCode,
  netPayout,
  amount,
  createdBy = null,
  notes = null,
  prismaClient = null,
}) {
  const code = settlementNumber || settlementCode || settlementId;
  const numNet = round(netPayout != null ? netPayout : amount);
  if (numNet <= 0) return null;

  const execute = async (tx) => {
    const result = await recordTransaction({
      companyId,
      type: 'WITHDRAW',
      reason: 'SETTLEMENT_PAYOUT',
      code,
      amount: numNet,
      notes: notes || `صرف مستحقات كشف التسوية ${code}`,
      createdBy,
      prismaClient: tx,
    });

    // Recalculate upcoming remittance
    const upcoming = await recalculateUpcomingRemittance(companyId, tx);
    result.wallet.upcomingRemittance = upcoming;

    return result;
  };

  if (prismaClient && typeof prismaClient.$transaction !== 'function') {
    return execute(prismaClient);
  }
  const prisma = prismaClient || getSharedPrismaClient();
  return prisma.$transaction(execute);
}

/**
 * Manual Balance Adjustment (Audited)
 * Requires createdBy and reason ADJUSTMENT
 */
async function adjustBalance({
  companyId,
  amount,
  type = 'DEPOSIT',
  code = null,
  notes,
  createdBy,
  prismaClient = null,
}) {
  if (!createdBy) throw serviceError('معرف المنشئ (createdBy) مطلوب لتوثيق التسوية اليدوية', 400);
  if (!notes || !String(notes).trim()) {
    throw serviceError('سبب وملاحظات التعديل اليدوي مطلوبة إلزامياً', 400);
  }

  const txCode = code ? String(code).trim() : `ADJ-${Date.now().toString(36).toUpperCase()}`;

  return recordTransaction({
    companyId,
    type,
    reason: 'ADJUSTMENT',
    code: txCode,
    amount,
    notes,
    createdBy,
    prismaClient,
  });
}

/**
 * List ledger transactions with filters, pagination, and CSV export
 * Acceptance 5: GET /wallet/transactions?reason=PRINT_FEE يرجّع الحركات المصنّفة فقط + تصدير CSV صالح
 */
async function listTransactions({
  companyId,
  from = null,
  to = null,
  type = null,
  reason = null,
  page = 1,
  limit = 20,
  exportCsv = false,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  const prisma = prismaClient || getSharedPrismaClient();

  const where = { companyId };
  if (type) where.type = String(type).toUpperCase();
  if (reason) where.reason = String(reason).toUpperCase();

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  if (exportCsv) {
    const allItems = await prisma.companyWalletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    // Generate CSV in Turbo format
    const headers = ['المعرف', 'النوع', 'السبب', 'الكود', 'القيمة', 'الرصيد بعد الحركة', 'ملاحظات', 'أنشأ بواسطة', 'التاريخ'];
    const rows = allItems.map((item) => {
      const typeAr = TYPE_LABELS_AR[item.type] || item.type;
      const reasonAr = REASON_LABELS_AR[item.reason] || item.reason;
      const createdStr = item.createdAt ? new Date(item.createdAt).toISOString() : '';
      return [
        `"${item.id}"`,
        `"${typeAr}"`,
        `"${reasonAr}"`,
        `"${item.code || ''}"`,
        Number(item.amount || 0).toFixed(2),
        Number(item.balanceAfter || 0).toFixed(2),
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        `"${item.createdBy || ''}"`,
        `"${createdStr}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    return {
      isCsv: true,
      filename: `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: csvContent,
      count: allItems.length,
    };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    prisma.companyWalletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.companyWalletTransaction.count({ where }),
  ]);

  const formatted = items.map((i) => ({
    id: i.id,
    type: i.type,
    typeLabel: TYPE_LABELS_AR[i.type] || i.type,
    reason: i.reason,
    reasonLabel: REASON_LABELS_AR[i.reason] || i.reason,
    code: i.code,
    amount: Number(i.amount),
    balanceAfter: Number(i.balanceAfter),
    notes: i.notes,
    createdBy: i.createdBy,
    createdAt: i.createdAt,
  }));

  return {
    items: formatted,
    transactions: formatted,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Report fees summary
 */
async function getFeeReport({ companyId, from = null, to = null, prismaClient = null }) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  const prisma = prismaClient || getSharedPrismaClient();

  const where = {
    companyId,
    type: 'WITHDRAW',
    reason: { in: ['PRINT_FEE', 'OPEN_PACKAGE_FEE'] },
  };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const transactions = await prisma.companyWalletTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  let totalPrintFees = 0;
  let printFeeCount = 0;
  let totalOpenPackageFees = 0;
  let openPackageCount = 0;

  for (const t of transactions) {
    const val = Number(t.amount || 0);
    if (t.reason === 'PRINT_FEE') {
      totalPrintFees += val;
      printFeeCount++;
    } else if (t.reason === 'OPEN_PACKAGE_FEE') {
      totalOpenPackageFees += val;
      openPackageCount++;
    }
  }

  return {
    totalFees: round(totalPrintFees + totalOpenPackageFees),
    printFees: {
      total: round(totalPrintFees),
      count: printFeeCount,
    },
    openPackageFees: {
      total: round(totalOpenPackageFees),
      count: openPackageCount,
    },
    items: transactions.map((t) => ({
      id: t.id,
      code: t.code,
      reason: t.reason,
      amount: Number(t.amount),
      createdAt: t.createdAt,
      notes: t.notes,
    })),
  };
}

module.exports = {
  getOrCreateWallet,
  recalculateUpcomingRemittance,
  recordTransaction,
  recordCodCollected,
  recordPrintFee,
  recordOpenPackageFee,
  recordSettlementPayout,
  adjustBalance,
  listTransactions,
  getFeeReport,
  REASON_LABELS_AR,
  TYPE_LABELS_AR,
};
