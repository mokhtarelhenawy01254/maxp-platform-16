const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_SETTINGS = {
  system: 'AUTO_DISCOUNT',
  enabled: true,
  discountPercent: 10,
  validityDays: 3,
  convertExpiredToCashback: true,
  pointsPerAmount: 5,
  pointsRedemptionValue: 1,
  redeemPointsEnabled: true,
};

/**
 * إعدادات نظام "الخصم التلقائي" لشركة معينة
 */
async function getSettings(companyId) {
  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { loyaltySystem: true, loyaltySettings: true }
  });
  let cfg = { ...DEFAULT_SETTINGS };
  try {
    if (company?.loyaltySettings) {
      cfg = { ...cfg, ...JSON.parse(company.loyaltySettings) };
    }
  } catch (e) { /* ignore malformed */ }
  return { ...cfg, loyaltySystem: company?.loyaltySystem || 'TIERS' };
}

/**
 * هل نظام الخصم التلقائي هو المفعل للشركة؟
 */
async function isAutoDiscountActive(companyId) {
  const s = await getSettings(companyId);
  return s.loyaltySystem === 'AUTO_DISCOUNT' && s.enabled !== false;
}

/**
 * تحديث إعدادات نظام الولاء للشركة
 * data.system: 'TIERS' | 'AUTO_DISCOUNT' (تفعيل أحدهما يعطّل الآخر)
 */
async function updateSettings(companyId, data) {
  const prisma = getSharedPrismaClient();
  const system = data.system === 'AUTO_DISCOUNT' ? 'AUTO_DISCOUNT' : 'TIERS';
  const current = await getSettings(companyId);
  const next = { ...current, ...data };
  delete next.loyaltySystem;
  next.system = system;
  await prisma.company.update({
    where: { id: companyId },
    data: {
      loyaltySystem: system,
      loyaltySettings: JSON.stringify(next)
    }
  });
  return next;
}

/**
 * إصدار كوبون خصم تلقائي بعد تسليم أوردر (مرة واحدة لكل أوردر)
 */
async function issueVoucherForDeliveredOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    const active = await isAutoDiscountActive(companyId);
    if (!active) return { issued: false, reason: 'system_off' };

    const order = await prisma.order.findFirst({ where: { id: orderId, companyId } });
    if (!order || !order.customerId) return { issued: false, reason: 'no_customer' };

    const existing = await prisma.customerLoyaltyVoucher.findFirst({
      where: { companyId, sourceOrderId: order.id, status: { in: ['ACTIVE', 'USED', 'CONVERTED'] } }
    });
    if (existing) return { issued: false, reason: 'already_issued' };

    const settings = await getSettings(companyId);
    const percent = Number(settings.discountPercent || 10);
    const paid = Number(order.total || 0);
    const amount = (paid * percent) / 100;
    const expiresAt = new Date(Date.now() + (Number(settings.validityDays || 3) * 24 * 60 * 60 * 1000));

    const voucher = await prisma.customerLoyaltyVoucher.create({
      data: {
        companyId,
        customerId: order.customerId,
        sourceOrderId: order.id,
        orderNumber: order.orderNumber,
        percent,
        amount,
        expiresAt
      }
    });
    return { issued: true, voucher };
  } catch (error) {
    console.error('❌ [AUTO-DISCOUNT] Failed to issue voucher:', error.message);
    return { issued: false, reason: 'error' };
  }
}

/**
 * أقرب كوبون نشط لعميل (غير مستخدم وغير منتهي)
 */
async function getActiveVoucher(customerId, companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId, customerId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * حساب خصم الكوبون للطلب الحالي (إن وُجد كوبون نشط)
 */
async function applyVoucherDiscount({ companyId, customerId, cartTotal }) {
  const prisma = getSharedPrismaClient();
  const voucher = await getActiveVoucher(customerId, companyId);
  if (!voucher) return { discount: 0, voucher: null };
  const discount = (Number(cartTotal) || 0) * (Number(voucher.percent) / 100);
  return { discount, voucher };
}

async function markVoucherUsed(voucherId) {
  if (!voucherId) return null;
  const prisma = getSharedPrismaClient();
  return prisma.customerLoyaltyVoucher.update({
    where: { id: voucherId },
    data: { status: 'USED', usedAt: new Date() }
  });
}

/**
 * تحويل الكوبونات المنتهية إلى كاش باك في المحفظة (cron)
 */
async function convertExpiredVouchers() {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const expired = await prisma.customerLoyaltyVoucher.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } }
  });
  let converted = 0;
  for (const v of expired) {
    try {
      const settings = await getSettings(v.companyId);
      if (settings.convertExpiredToCashback !== false) {
        const WalletService = require('./walletService');
        const result = await WalletService.addCashback(v.customerId, v.sourceOrderId, Number(v.amount), 1, Number(v.amount));
        await prisma.customerLoyaltyVoucher.update({
          where: { id: v.id },
          data: { status: 'CONVERTED', convertedAt: new Date(), convertedWalletTxId: result?.transaction?.id }
        });
        converted++;
      } else {
        await prisma.customerLoyaltyVoucher.update({
          where: { id: v.id },
          data: { status: 'EXPIRED' }
        });
      }
    } catch (error) {
      console.error(`❌ [AUTO-DISCOUNT] Convert failed for voucher ${v.id}:`, error.message);
    }
  }
  return { converted, expiredCount: expired.length };
}

/**
 * إلغاء كوبونات أوردر عند إلغاء/رجوع الأوردر المصدر،
 * واسترجاع الكوبون المستخدم إن كان الطلب استخدم كوبون.
 */
async function reverseVoucherForOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    // 1) إلغاء الكوبونات النشطة/المنتهية الصادرة من هذا الأوردر
    await prisma.customerLoyaltyVoucher.updateMany({
      where: { companyId, sourceOrderId: orderId, status: { in: ['ACTIVE', 'EXPIRED'] } },
      data: { status: 'CANCELLED' }
    });
    // 2) لو كوبون من هذا الأوردر اتحوّل لكاش باك، نخصمه من المحفظة
    const converted = await prisma.customerLoyaltyVoucher.findMany({
      where: { companyId, sourceOrderId: orderId, status: 'CONVERTED' }
    });
    for (const v of converted) {
      try {
        const WalletService = require('./walletService');
        const wallet = await prisma.customerWallet.findFirst({ where: { customerId: v.customerId } });
        if (wallet && Number(wallet.balance) >= Number(v.amount)) {
          await WalletService.deductFromWallet(v.customerId, Number(v.amount), `ترجيع كوبون منتهي للأوردر ${v.orderNumber}`);
        }
        await prisma.customerLoyaltyVoucher.update({ where: { id: v.id }, data: { status: 'CANCELLED' } });
      } catch (error) {
        console.error(`❌ [AUTO-DISCOUNT] Converted-voucher wallet reversal failed for ${v.id}:`, error.message);
      }
    }
    // 3) لو الأوردر استخدم كوبون، نرجّع الكوبون نشط (إن لسه في نافذة صلاحيته)
    const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { metadata: true } });
    if (order?.metadata) {
      try {
        const meta = JSON.parse(order.metadata);
        const usedVoucherId = meta?.autoDiscount?.usedVoucherId;
        if (usedVoucherId) {
          const v = await prisma.customerLoyaltyVoucher.findUnique({ where: { id: usedVoucherId } });
          if (v && v.status === 'USED' && new Date(v.expiresAt) > new Date()) {
            await prisma.customerLoyaltyVoucher.update({ where: { id: usedVoucherId }, data: { status: 'ACTIVE', usedAt: null } });
          }
        }
      } catch (e) { /* ignore */ }
    }
    return { reversed: true };
  } catch (error) {
    console.error('❌ [AUTO-DISCOUNT] Reverse failed:', error.message);
    return { reversed: false };
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  isAutoDiscountActive,
  updateSettings,
  issueVoucherForDeliveredOrder,
  getActiveVoucher,
  applyVoucherDiscount,
  markVoucherUsed,
  convertExpiredVouchers,
  reverseVoucherForOrder
};
