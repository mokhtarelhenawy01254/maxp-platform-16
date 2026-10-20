const { getSharedPrismaClient } = require('./sharedDatabase');
const WalletService = require('./walletService');

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Ensures a cashback program exists for the company.
 */
async function ensureCashbackProgram(prisma, companyId, createdBy) {
  const existing = await prisma.customerLoyaltyProgram.findFirst({
    where: {
      companyId,
      type: 'CASHBACK'
    },
    orderBy: { createdAt: 'asc' }
  });

  if (existing) return existing;

  // Create default program if not exists
  return prisma.customerLoyaltyProgram.create({
    data: {
      companyId,
      name: 'Cashback',
      nameAr: 'كاش باك',
      type: 'CASHBACK',
      status: 'INACTIVE', // Default to inactive for safety
      pointsPerPurchase: '0.00',
      pointsPerReferral: '0.00',
      redemptionRate: '1.00',
      minimumPoints: '0.00',
      expiryMonths: 12,
      rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed', maxPerOrder: 0, tierOverrides: {} }),
      createdBy: createdBy || 'system'
    }
  });
}

/**
 * Applies cashback for a paid/delivered order based on company settings.
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.companyId
 * @param {string} params.changedBy - User ID who triggered this
 */
async function applyCashbackForPaidOrder({ orderId, companyId, changedBy }) {
  const prisma = getSharedPrismaClient();

  // 1. Fetch Order with details
  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: {
      id: true,
      companyId: true,
      customerId: true,
      paymentStatus: true,
      status: true,
      subtotal: true,
      tax: true,
      shipping: true,
      discount: true,
      total: true,
      metadata: true,
      orderNumber: true,
      // 🚨 2026-10-20: القالب القانوني لـ CASHBACK_CREDITED بيستخدم {currency} —
      // كانت مش بتتقرأ فميتا كانت بتاخد '—' أو عدد بارامترات مختلف (#132000).
      currency: true
    }
  });

  if (!order) return { applied: false, reason: 'order_not_found' };
  if (!order.customerId) return { applied: false, reason: 'no_customer' };

  // 2. Security Check: Prevent Double Dipping
  // Check if a cashback transaction already exists for this order
  const existingTx = await prisma.walletTransaction.findFirst({
    where: {
      orderId: order.id,
      type: 'CASHBACK',
      wallet: {
        customerId: order.customerId
      }
    }
  });

  if (existingTx) {
    console.log(`⚠️ Cashback already applied for order ${order.orderNumber} (Tx: ${existingTx.id})`);
    return { applied: false, reason: 'already_applied_transaction' };
  }

  // 3. Fetch Settings
  const program = await ensureCashbackProgram(prisma, companyId, changedBy);

  // If program is disabled, do nothing
  if (program.status !== 'ACTIVE') {
    return { applied: false, reason: 'program_inactive' };
  }

  const rules = parseJsonMaybe(program.rules, {});
  let percent = Number(rules.cashbackPercent || 0);

  // 3a. Tier Overrides
  const customerRecord = await prisma.customerLoyaltyRecord.findUnique({
    where: {
      customerId_programId: {
        customerId: order.customerId,
        programId: program.id
      }
    }
  });

  const tierOverrides = rules.tierOverrides || {};
  if (customerRecord && customerRecord.tierId && tierOverrides[customerRecord.tierId] !== undefined) {
    const overridePercent = Number(tierOverrides[customerRecord.tierId]);
    if (Number.isFinite(overridePercent) && overridePercent >= 0) {
      percent = overridePercent;
      console.log(`ℹ️ Applied Tier Override for Customer ${order.customerId} (Tier ${customerRecord.tierId}): ${percent}%`);
    }
  }

  // If percentage is 0 or invalid, do nothing
  if (!Number.isFinite(percent) || percent <= 0) {
    return { applied: false, reason: 'percent_zero' };
  }

  // 4. Calculate Amount
  const base = rules.base || 'total';
  let baseAmount = 0;

  if (base === 'subtotal') {
    // Subtotal often includes tax in some systems, but usually it's pre-tax/shipping. 
    // We strictly use subtotal - discount here to be fair.
    baseAmount = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
  } else {
    // المبلغ المدفوع فعلاً بعد الخصومات (finalTotal)، مع fallback للإجمالي
    baseAmount = Math.max(0, Number(order.finalTotal ?? order.total ?? 0));
  }

  let cashbackAmount = Math.max(0, (baseAmount * percent) / 100);

  // 5. Apply Max Limit
  const maxPerOrder = Number(rules.maxPerOrder || 0);
  let capped = false;
  if (maxPerOrder > 0 && cashbackAmount > maxPerOrder) {
    cashbackAmount = maxPerOrder;
    capped = true;
    console.log(`ℹ️ Capped Cashback at Max Limit: ${maxPerOrder} EGP`);
  }

  if (cashbackAmount <= 0) {
    return { applied: false, reason: 'calculated_amount_zero' };
  }

  // 5. Apply to Wallet (Use WalletService for consistency)
  try {
    const result = await WalletService.addCashback(
      order.customerId,
      order.id,
      baseAmount,
      percent / 100,
      cashbackAmount
    );

    // 6. Update Order Metadata (for visibility)
    const meta = parseJsonMaybe(order.metadata, {});
    const nextMeta = {
      ...meta,
      cashback: {
        applied: true,
        programId: program.id,
        percent,
        base,
        amount: cashbackAmount.toFixed(2),
        capped,
        appliedAt: new Date().toISOString(),
        transactionId: result?.transaction?.id
      }
    };

    await prisma.order.update({
      where: { id: order.id },
      data: { metadata: JSON.stringify(nextMeta) }
    });

    console.log(`✅ Applied ${percent}% Cashback (${cashbackAmount} EGP) for Order ${order.orderNumber}`);

    // 🔔 إشعار ايداع كاش باك
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (customer && customer.phone) {
        const scheduleService = require('./hr/customerNotificationScheduleService');
        const balance = await WalletService.getWalletBalance(order.customerId).catch(() => 0);
        await scheduleService.sendCustomerNotification({
          companyId,
          eventType: 'CASHBACK_CREDITED',
          customer,
          customerId: order.customerId,
          orderId: order.id,
          variables: {
            // 🚨 2026-10-20: مطابقة أسماء متغيرات القالب القانوني (CASHBACK_CREDITED):
            // customerName بيتضاف في customerNotificationScheduleService، وهنا بنضمن
            // amount + cashAmount (alias) + currency + orderNumber + balance — نفس
            // ترتيب القالب المعتمد، فمفيش META_PARAM_COUNT_MISMATCH ولا قيم '—'.
            amount: cashbackAmount.toFixed(2),
            cashAmount: cashbackAmount.toFixed(2),
            currency: order.currency || 'EGP',
            orderNumber: order.orderNumber,
            balance: String(Number(balance || 0).toFixed(2))
          }
        });
      }
    } catch (notifyError) {
      console.warn('⚠️ [CASHBACK] Failed to send credited notification:', notifyError.message);
    }

    return {
      applied: true,
      amount: cashbackAmount.toFixed(2),
      percent,
      transactionId: result?.transaction?.id
    };

  } catch (err) {
    console.error(`❌ Failed to apply cashback for order ${order.orderNumber}:`, err);
    throw err;
  }
}

/**
 * Reverses cashback if an order is returned/refunded.
 */
async function reverseCashbackForReturn({ returnRequestId, companyId, changedBy }) {
  const prisma = getSharedPrismaClient();

  const rr = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, companyId },
    include: {
      order: {
        select: {
          id: true,
          companyId: true,
          customerId: true,
          total: true,
          metadata: true,
          orderNumber: true
        }
      }
    }
  });

  if (!rr || !rr.order) return { reversed: false, reason: 'request_not_found' };
  if (!rr.refundAmount) return { reversed: false, reason: 'no_refund_amount' };

  // Check if cashback was actually applied
  const meta = parseJsonMaybe(rr.order.metadata, {});
  if (!meta.cashback || !meta.cashback.applied) {
    return { reversed: false, reason: 'no_cashback_on_original_order' };
  }

  const originalCashback = Number(meta.cashback.amount || 0);
  if (originalCashback <= 0) return { reversed: false, reason: 'original_cashback_zero' };

  // Calculate Reversal Amount (Proportional)
  const orderTotal = Math.max(0.01, Number(rr.order.total || 0));
  const refundAmount = Number(rr.refundAmount || 0);

  const ratio = Math.max(0, Math.min(1, refundAmount / orderTotal));
  const reverseAmount = originalCashback * ratio; // Proportional reversal

  if (reverseAmount <= 0) return { reversed: false, reason: 'reverse_amount_zero' };

  // Check previous reversals to prevent double deduction
  const recordedReversals = meta.cashback.reversals || {};
  if (recordedReversals[returnRequestId]) {
    return { reversed: false, reason: 'already_reversed' };
  }

  // Deduct from Wallet
  try {
    await WalletService.deductFromWallet(
      rr.order.customerId,
      reverseAmount,
      `Cashback reversal for return #${rr.id} (${(ratio * 100).toFixed(0)}%)`
    );

    // Update Metadata
    const nextMeta = { ...meta };
    nextMeta.cashback.reversals = {
      ...recordedReversals,
      [returnRequestId]: {
        amount: reverseAmount.toFixed(2),
        date: new Date().toISOString(),
        ratio: ratio.toFixed(2)
      }
    };

    await prisma.order.update({
      where: { id: rr.order.id },
      data: { metadata: JSON.stringify(nextMeta) }
    });

    console.log(`✅ Reversed Cashback (${reverseAmount.toFixed(2)} EGP) for Return on Order ${rr.order.orderNumber}`);

    // 🔔 إشعار خصم كاش باك (مرتجع)
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: rr.order.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (customer && customer.phone) {
        const scheduleService = require('./hr/customerNotificationScheduleService');
        await scheduleService.sendCustomerNotification({
          companyId,
          eventType: 'CASHBACK_REVERSED',
          customer,
          customerId: rr.order.customerId,
          orderId: rr.order.id,
          variables: {
            amount: reverseAmount.toFixed(2),
            orderNumber: rr.order.orderNumber
          }
        });
      }
    } catch (notifyError) {
      console.warn('⚠️ [CASHBACK] Failed to send reversed notification:', notifyError.message);
    }

    return { reversed: true, amount: reverseAmount.toFixed(2) };

  } catch (error) {
    console.error(`❌ Failed to reverse cashback for return ${rr.id}:`, error);
    // Even if deduction fails (e.g. low balance), we should log it. consider allowing negative balance or partial deduction in future.
    return { reversed: false, error: error.message };
  }
}

/**
 * Reverses cashback when a delivered order is cancelled outright (no return request).
 */
async function reverseCashbackForOrder({ orderId, companyId, changedBy }) {
  const prisma = getSharedPrismaClient();

  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: {
      id: true,
      companyId: true,
      customerId: true,
      total: true,
      metadata: true,
      orderNumber: true
    }
  });

  if (!order || !order.customerId) return { reversed: false, reason: 'order_not_found' };

  const meta = parseJsonMaybe(order.metadata, {});
  if (!meta.cashback || !meta.cashback.applied) return { reversed: false, reason: 'no_cashback_on_order' };

  if (meta.cashback.cancelledReversed) return { reversed: false, reason: 'already_reversed' };

  const cashbackAmount = Number(meta.cashback.amount || 0);
  if (cashbackAmount <= 0) return { reversed: false, reason: 'cashback_zero' };

  try {
    await WalletService.deductFromWallet(
      order.customerId,
      cashbackAmount,
      `إلغاء كاش باك الطلب #${order.orderNumber}`
    );
  } catch (error) {
    console.error(`❌ Failed to reverse cashback for cancelled order ${order.orderNumber}:`, error.message);
    return { reversed: false, error: error.message };
  }

  const nextMeta = { ...meta };
  nextMeta.cashback = {
    ...meta.cashback,
    cancelledReversed: true,
    cancelledReversal: {
      amount: cashbackAmount,
      date: new Date().toISOString()
    }
  };

  await prisma.order.update({
    where: { id: order.id },
    data: { metadata: JSON.stringify(nextMeta) }
  });

  console.log(`✅ Reversed ${cashbackAmount} EGP cashback for cancelled order #${order.orderNumber}`);

  // 🔔 إشعار خصم كاش باك (إلغاء طلب)
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: order.customerId },
      select: { id: true, phone: true, firstName: true, lastName: true }
    });
    if (customer && customer.phone) {
      const scheduleService = require('./hr/customerNotificationScheduleService');
      await scheduleService.sendCustomerNotification({
        companyId,
        eventType: 'CASHBACK_REVERSED',
        customer,
        customerId: order.customerId,
        orderId: order.id,
        variables: {
          amount: cashbackAmount.toFixed(2),
          orderNumber: order.orderNumber
        }
      });
    }
  } catch (notifyError) {
    console.warn('⚠️ [CASHBACK] Failed to send reversed notification:', notifyError.message);
  }

  return { reversed: true, amount: cashbackAmount };
}

module.exports = {
  applyCashbackForPaidOrder,
  reverseCashbackForReturn,
  reverseCashbackForOrder,
  ensureCashbackProgram
};
