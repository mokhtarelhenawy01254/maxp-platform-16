const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_SETTINGS = {
  system: 'AUTO_DISCOUNT',
  activated: false,
  enabled: true,
  discountPercent: 10,
  validityDays: 3,
  convertExpiredToCashback: true,
  pointsPerAmount: 5,
  pointsRedemptionValue: 1,
  redeemPointsEnabled: true,
  // 🆕 فلاجات تفعيل مستقلة لكل نظام (عشان المستويات والخصم التلقائي يشتغلوا مع بعض)
  tiersEnabled: false,
  autoDiscountEnabled: false,
  // 🆕 وضع دمج خصم المستوى + كوبون الخصم التلقائي:
  //   'BEST' = أعلى خصم بس | 'ADDITIVE' = جمع النسب | 'COMPOUND' = مركّب
  discountCombination: 'ADDITIVE',
  // حد أقصى لإجمالي الخصم (٪) — 0 = بدون حد
  maxTotalDiscountPercent: 20,
};

/**
 * إعدادات نظام "الخصم التلقائي" لشركة معينة
 */
async function getSettings(companyId) {
  const prisma = getSharedPrismaClient();
  // 🛡️ لو الـ companyId ناقص/غير صالح (مثل SUPER_ADMIN من غير سياق شركة)
  // نرجّع الإعدادات الافتراضية بدل ما نوقع في خطأ Prisma validation → 500
  if (!companyId) {
    return { ...DEFAULT_SETTINGS, loyaltySystem: 'TIERS' };
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { loyaltySystem: true, loyaltySettings: true }
  });
  let cfg = { ...DEFAULT_SETTINGS };
  let storedSettings = {};
  try {
    if (company?.loyaltySettings) {
      storedSettings = JSON.parse(company.loyaltySettings);
      cfg = { ...cfg, ...storedSettings };
    }
  } catch (e) { /* ignore malformed */ }
  const result = { ...cfg, loyaltySystem: company?.loyaltySystem || 'TIERS' };
  // 🟢 backfill: الشركات اللي كانت شغالة قبل إضافة فلاج التفعيل تفضل مفعّلة (السلوك القديم)
  if (storedSettings.activated === undefined) {
    result.activated = Boolean(company?.loyaltySystem);
  }
  // 🕐 backfill: لو الخصم التلقائي مفعّل وملوش تاريخ تفعيل محفوظ (بيانات قديمة)،
  // نستدل من أول كوبون صدر ونحفظه مرة واحدة عشان التاريخ يبقى ثابت
  if (result.loyaltySystem === 'AUTO_DISCOUNT' && !result.loyaltyActivatedAt) {
    try {
      const firstVoucher = await prisma.customerLoyaltyVoucher.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });
      if (firstVoucher?.createdAt) {
        result.loyaltyActivatedAt = firstVoucher.createdAt.toISOString();
        const persisted = { ...cfg, loyaltyActivatedAt: result.loyaltyActivatedAt };
        await prisma.company.update({
          where: { id: companyId },
          data: { loyaltySettings: JSON.stringify(persisted) }
        }).catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }
  return result;
}

/**
 * هل نظام الخصم التلقائي هو المفعل للشركة؟
 * 🆕 مستقل عن نظام المستويات — بيعتمد على autoDiscountEnabled
 */
async function isAutoDiscountActive(companyId) {
  const s = await getSettings(companyId);
  return s.autoDiscountEnabled === true && s.enabled !== false;
}

/**
 * هل نظام المستويات (Tiers) هو المفعل للشركة؟
 * 🆕 مستقل عن الخصم التلقائي — بيعتمد على tiersEnabled
 */
async function isTiersActive(companyId) {
  const s = await getSettings(companyId);
  return s.tiersEnabled === true;
}

/**
 * هل نظام الولاء (أياً كان: مستويات أو خصم تلقائي) مفعّل فعلاً للشركة؟
 */
async function isLoyaltySystemActivated(companyId) {
  const s = await getSettings(companyId);
  return s.activated === true;
}

/**
 * تحديث إعدادات نظام الولاء للشركة
 * data.system: 'TIERS' | 'AUTO_DISCOUNT' (تفعيل أحدهما يعطّل الآخر)
 * data.activated: true = تم الضغط على "تفعيل النظام" → النظام يشتغل فعلياً
 */
async function updateSettings(companyId, data) {
  const prisma = getSharedPrismaClient();
  // 🛡️ لو الـ companyId ناقص، منمنعش P2025/validation → 500 على الحفظ
  if (!companyId) {
    throw new Error('Company context is missing');
  }
  const system = data.system === 'AUTO_DISCOUNT' ? 'AUTO_DISCOUNT' : 'TIERS';
  const current = await getSettings(companyId);
  const next = { ...current, ...data };
  delete next.loyaltySystem;
  next.system = system;
  // 🟢 التفعيل بيتغير فقط لما الـ activated يتوصَّل صراحة في الطلب
  //    (مش بيتلغى بمجرد اختيار النظام التاني في الواجهة)
  if (data.activated !== undefined) {
    next.activated = data.activated === true;
  }
  // 🕐 عند تفعيل الخصم التلقائي لأول مرة (أو الرجوع إليه بعد المستويات) نحفظ تاريخ التفعيل
  if (system === 'AUTO_DISCOUNT' && next.activated === true && current.loyaltySystem !== 'AUTO_DISCOUNT') {
    next.loyaltyActivatedAt = new Date().toISOString();
  }
  // 🆕 مزامنة الفلاجات المستقلة مع النظام القديم (عشان الفرونت القديم يفضل شغال)
  next.tiersEnabled = (system === 'TIERS' && next.activated === true);
  next.autoDiscountEnabled = (system === 'AUTO_DISCOUNT' && next.activated === true);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      loyaltySystem: system,
      loyaltySettings: JSON.stringify(next)
    }
  });
  // ✅ نرجّع loyaltySystem في الـ response عشان الواجهة تعرف النظام الفعلي المفعّل
  return { ...next, loyaltySystem: system };
}

/**
 * 🆕 تحديث موحّد لإعدادات الولاء مع فلاجات تفعيل مستقلة:
 * - tiersEnabled / autoDiscountEnabled: كل واحد لوحده (الاتنين ممكن يشتغلوا مع بعض)
 * - discountCombination: وضع دمج الخصم (BEST | ADDITIVE | COMPOUND)
 * - maxTotalDiscountPercent: حد أقصى لإجمالي الخصم (%) — 0 = بدون حد
 * - حقول إعداد الخصم التلقائي (discountPercent ...)
 * ملاحظة: الكاش باك (cashbackEnabled) بيتعامل معاه الـ controller عشان يظبط على status برنامج CASHBACK.
 */
async function updateLoyaltyConfig(companyId, config = {}) {
  const prisma = getSharedPrismaClient();
  if (!companyId) throw new Error('Company context is missing');
  const current = await getSettings(companyId);
  const next = { ...current };

  if (config.tiersEnabled !== undefined) next.tiersEnabled = config.tiersEnabled === true;
  if (config.autoDiscountEnabled !== undefined) next.autoDiscountEnabled = config.autoDiscountEnabled === true;
  if (config.discountCombination !== undefined) {
    const allowedCombos = ['BEST', 'ADDITIVE', 'COMPOUND'];
    next.discountCombination = allowedCombos.includes(config.discountCombination)
      ? config.discountCombination
      : 'ADDITIVE';
  }
  if (config.maxTotalDiscountPercent !== undefined) {
    const pct = Number(config.maxTotalDiscountPercent);
    next.maxTotalDiscountPercent = Number.isFinite(pct) && pct > 0 ? pct : 0;
  }

  const autoFields = [
    'discountPercent', 'validityDays', 'convertExpiredToCashback',
    'pointsPerAmount', 'pointsRedemptionValue', 'redeemPointsEnabled', 'enabled'
  ];
  for (const k of autoFields) {
    if (config[k] !== undefined) next[k] = config[k];
  }

  // 🕐 تاريخ تفعيل الخصم التلقائي أول مرة يتفعّل
  if (next.autoDiscountEnabled === true && current.autoDiscountEnabled !== true) {
    next.loyaltyActivatedAt = new Date().toISOString();
  }

  // 🔄 نحافظ على الحقول legacy (loyaltySystem/activated) متزامنة لأن كود قديم لسه بيقرأها
  if (next.tiersEnabled && !next.autoDiscountEnabled) {
    next.loyaltySystem = 'TIERS'; next.activated = true;
  } else if (next.autoDiscountEnabled && !next.tiersEnabled) {
    next.loyaltySystem = 'AUTO_DISCOUNT'; next.activated = true;
  } else if (next.tiersEnabled && next.autoDiscountEnabled) {
    next.activated = true; next.loyaltySystem = current.loyaltySystem || 'TIERS';
  } else {
    next.activated = false;
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { loyaltySystem: next.loyaltySystem, loyaltySettings: JSON.stringify(next) }
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
    // 🕐 الأوردرات اللي اتطلبت قبل تفعيل نظام الولاء مش بتاخد كوبون خصم
    const activatedAt = await getLoyaltyActivatedAt(companyId, settings);
    if (activatedAt && new Date(order.createdAt) < activatedAt) {
      return { issued: false, reason: 'order_before_activation' };
    }
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

    // 📨 إشعار العميل بمنح كوبون الخصم التلقائي (عبر جدول إشعارات العملاء)
    try {
      const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (customer) {
        await sendCustomerNotification({
          companyId,
          eventType: 'AUTO_DISCOUNT_COUPON_GRANTED',
          customer: {
            id: customer.id,
            phone: customer.phone,
            firstName: customer.firstName,
            lastName: customer.lastName,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          },
          customerId: customer.id,
          orderId: order.id,
          variables: {
            discountPercent: String(percent),
            voucherAmount: String(amount.toFixed(2)),
            validityDays: String(Number(settings.validityDays || 3)),
            expiryDate: expiresAt.toISOString().slice(0, 10),
            orderNumber: order.orderNumber || ''
          }
        });
      }
    } catch (notifError) {
      console.warn(`⚠️ [AUTO-DISCOUNT-NOTIF] Failed to notify ${orderNumber}:`, notifError.message);
    }

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
        // 🛡️ Idempotency: لو الكوبون ده اتحوّل فعلاً (فيه transaction id)، نتخطاه
        // عشان منضاعفش الكاش باك لو الـ cron اشتغل تاني على نفس الكوبون.
        const already = await prisma.customerLoyaltyVoucher.findUnique({
          where: { id: v.id },
          select: { status: true, convertedWalletTxId: true }
        });
        if (!already || already.status !== 'ACTIVE' || already.convertedWalletTxId) {
          continue;
        }

        const WalletService = require('./walletService');
        // 🛡️ بنعمل addCashback + تحديث حالة الكوبون في نفس الـ transaction
        // عشان لو فشل أي واحد، ميحصلش كاش باك من غير تحويل حالة (ولا العكس).
        const result = await prisma.$transaction(async (tx) => {
          const walletRes = await WalletService.addCashbackWithTx(
            tx, v.customerId, v.sourceOrderId, Number(v.amount), 1, Number(v.amount)
          );
          const updated = await tx.customerLoyaltyVoucher.update({
            where: { id: v.id },
            data: { status: 'CONVERTED', convertedAt: new Date(), convertedWalletTxId: walletRes?.transaction?.id }
          });
          return { updated, txId: walletRes?.transaction?.id };
        });
        converted++;

        // 📨 إشعار العميل بتحويل الكوبون المنتهي إلى كاش باك
        try {
          const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
          const customer = await prisma.customer.findUnique({
            where: { id: v.customerId },
            select: { id: true, phone: true, firstName: true, lastName: true }
          });
          if (customer) {
            let walletBalance = '0.00';
            try {
              const WalletService = require('./walletService');
              const bal = await WalletService.getWalletBalance(customer.id);
              walletBalance = String(Number(bal || 0).toFixed(2));
            } catch (_) { /* ignore — fallback to 0.00 */ }
            await sendCustomerNotification({
              companyId: v.companyId,
              eventType: 'AUTO_DISCOUNT_CASHBACK_CONVERTED',
              customer: {
                id: customer.id,
                phone: customer.phone,
                firstName: customer.firstName,
                lastName: customer.lastName,
                name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
              },
              customerId: customer.id,
              variables: {
                voucherAmount: String(Number(v.amount).toFixed(2)),
                cashAmount: String(Number(v.amount).toFixed(2)),
                currency: 'ج.م',
                balance: walletBalance,
                orderNumber: v.orderNumber || ''
              }
            });
          }
        } catch (notifError) {
          console.warn(`⚠️ [AUTO-DISCOUNT-NOTIF] Failed to notify convert for voucher ${v.id}:`, notifError.message);
        }
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

/**
 * استرجاع النقاط اللي استخدمها العميل كدفع (نقطة = value ج) عند إلغاء/رجوع الأوردر
 */
async function restoreRedeemedPointsForOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { metadata: true, customerId: true, orderNumber: true } });
    if (!order?.metadata || !order.customerId) return { restored: false, reason: 'no_metadata' };

    let meta;
    try { meta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata; } catch (e) { return { restored: false, reason: 'bad_metadata' }; }

    let pr = meta?.pointsRedemption;
    // Fallback: بعض الأوردرات بتحط الـ pointsRedemption على الـ GuestOrder فقط
    if (!pr || !pr.pointsUsed) {
      const guestOrder = await prisma.guestOrder.findFirst({ where: { orderNumber: order.orderNumber || '', companyId }, select: { metadata: true } });
      if (guestOrder?.metadata) {
        try {
          const gm = typeof guestOrder.metadata === 'string' ? JSON.parse(guestOrder.metadata) : guestOrder.metadata;
          pr = gm?.pointsRedemption || pr;
        } catch (e) { /* ignore */ }
      }
    }
    if (!pr || !pr.pointsUsed || !pr.programId) return { restored: false, reason: 'no_points_redemption' };

    const pointsUsed = Number(pr.pointsUsed);
    const record = await prisma.customerLoyaltyRecord.findUnique({
      where: { customerId_programId: { customerId: order.customerId, programId: pr.programId } }
    });
    if (!record) return { restored: false, reason: 'no_record' };

    await prisma.customerLoyaltyRecord.update({
      where: { id: record.id },
      data: {
        currentPoints: (parseFloat(record.currentPoints) || 0) + pointsUsed,
        totalRedeemed: Math.max(0, (parseFloat(record.totalRedeemed) || 0) - pointsUsed)
      }
    });
    return { restored: true, points: pointsUsed };
  } catch (error) {
    console.error('❌ [AUTO-DISCOUNT] Restore redeemed points failed:', error.message);
    return { restored: false, reason: 'error' };
  }
}

/**
 * تاريخ تفعيل نظام الخصم التلقائي للشركة.
 * لو ملوش تاريخ محفوظ (بيانات قديمة) نستدل من أول كوبون صدر.
 */
async function getLoyaltyActivatedAt(companyId, settings) {
  const raw = settings?.loyaltyActivatedAt;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  const prisma = getSharedPrismaClient();
  const firstVoucher = await prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return firstVoucher?.createdAt ? new Date(firstVoucher.createdAt) : null;
}

/**
 * حالة خصم عميل واحد:
 * - 'AVAILABLE': عنده كوبون خصم فعّال (خصم متاح)
 * - 'PRE_ACTIVATION': كل أوردراته المسلّمة اتطلبت قبل تفعيل نظام الولاء (مش بيطبق عليه)
 * - null: مش له حالة (مفيش أوردرات / استخدم الخصم)
 */
/**
 * Get customer ids matching an auto-discount status filter.
 * - 'AVAILABLE': customer has an active, unexpired discount voucher
 * - 'PRE_ACTIVATION': customer had delivered orders before activation but none after
 * Returns [] when the auto-discount system is not enabled.
 */
async function getCustomerIdsByAutoDiscountStatus(companyId, status) {
  const prisma = getSharedPrismaClient();
  if (!status) return [];
  const settings = await getSettings(companyId);
  if (settings.autoDiscountEnabled !== true || settings.enabled === false) return [];

if (status === 'AVAILABLE') {
      const vouchers = await prisma.customerLoyaltyVoucher.findMany({
        where: { companyId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
        select: { customerId: true },
        distinct: ['customerId']
      });
      return vouchers.map((v) => v.customerId).filter(Boolean);
    }

  if (status === 'PRE_ACTIVATION') {
    const activatedAt = await getLoyaltyActivatedAt(companyId, settings);
    if (!activatedAt) return [];
    const [preOrders, postOrders] = await Promise.all([
      prisma.order.findMany({
        where: { companyId, status: 'DELIVERED', createdAt: { lt: activatedAt } },
        select: { customerId: true },
        distinct: ['customerId']
      }),
      prisma.order.findMany({
        where: { companyId, status: 'DELIVERED', createdAt: { gte: activatedAt } },
        select: { customerId: true },
        distinct: ['customerId']
      })
    ]);
    const postIds = new Set(postOrders.map(o => o.customerId).filter(Boolean));
    return preOrders.map(o => o.customerId).filter(id => id && !postIds.has(id));
  }

  return [];
}

async function getCustomerAutoDiscountStatus({ companyId, customerId, settings }) {
  const prisma = getSharedPrismaClient();
  const cfg = settings || await getSettings(companyId);
  const voucher = await prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId, customerId, status: 'ACTIVE', expiresAt: { gt: new Date() } }
  });
  if (voucher) return 'AVAILABLE';

  const activatedAt = await getLoyaltyActivatedAt(companyId, cfg);
  if (!activatedAt) return null;

  const [pre, post] = await Promise.all([
    prisma.order.findFirst({
      where: { companyId, customerId, status: 'DELIVERED', createdAt: { lt: activatedAt } },
      select: { id: true }
    }),
    prisma.order.findFirst({
      where: { companyId, customerId, status: 'DELIVERED', createdAt: { gte: activatedAt } },
      select: { id: true }
    })
  ]);
  if (pre && !post) return 'PRE_ACTIVATION';
  return null;
}

/**
 * تحويل كائن الكوبون للشكل الموحّد اللي بيرجع للواجهة (مستخدم في كل الأماكن).
 */
function mapVoucherToPublic(voucher) {
  if (!voucher) return null;
  return {
    id: voucher.id,
    percent: Number(voucher.percent),
    amount: Number(voucher.amount),
    expiresAt: voucher.expiresAt,
    sourceOrderNumber: voucher.orderNumber || null
  };
}

/**
 * ملخص الخصم التلقائي لعميل واحد (كوبون فعّال + حالة الخصم) — مستخدم في بوابة العميل
 * في مكانين (المسؤول + العميل نفسه) عشان مفيش تكرار/انحراف.
 */
async function getCustomerAutoDiscountSummary({ customerId, companyId, settings }) {
  const cfg = settings || await getSettings(companyId);
  const voucher = await getActiveVoucher(customerId, companyId);
  let status = null;
  if (voucher) {
    status = 'AVAILABLE';
  } else {
    status = await getCustomerAutoDiscountStatus({ companyId, customerId, settings: cfg });
  }
  return { activeVoucher: mapVoucherToPublic(voucher), status };
}

/**
 * إثراء قائمة عملاء بحالة الخصم (AVAILABLE / PRE_ACTIVATION) لصفحة قائمة العملاء.
 * بيبقى null لو نظام الخصم التلقائي مش مفعّل أو مفيش حالة.
 */async function enrichCustomersWithAutoDiscountStatus(companyId, customers) {
  if (!Array.isArray(customers) || customers.length === 0) return customers;
  const settings = await getSettings(companyId);
  if (settings.autoDiscountEnabled !== true || settings.enabled === false) {
    return customers;
  }
  const prisma = getSharedPrismaClient();
  const ids = customers.map(c => c.id);
  const now = new Date();

  const activeVouchers = await prisma.customerLoyaltyVoucher.findMany({
    where: { companyId, customerId: { in: ids }, status: 'ACTIVE', expiresAt: { gt: now } },
    select: { customerId: true }
  });
  const availableIds = new Set(activeVouchers.map(v => v.customerId));

  const activatedAt = await getLoyaltyActivatedAt(companyId, settings);
  let preActivationIds = new Set();
  if (activatedAt) {
    const preOrders = await prisma.order.findMany({
      where: { companyId, customerId: { in: ids }, status: 'DELIVERED', createdAt: { lt: activatedAt } },
      select: { customerId: true },
      distinct: ['customerId']
    });
    if (preOrders.length > 0) {
      const preIds = new Set(preOrders.map(o => o.customerId));
      const postOrders = await prisma.order.findMany({
        where: { companyId, customerId: { in: ids }, status: 'DELIVERED', createdAt: { gte: activatedAt } },
        select: { customerId: true },
        distinct: ['customerId']
      });
      const postIds = new Set(postOrders.map(o => o.customerId));
      preActivationIds = new Set([...preIds].filter(id => !postIds.has(id)));
    }
  }

  return customers.map(c => ({
    ...c,
    autoDiscountStatus: availableIds.has(c.id) ? 'AVAILABLE' : preActivationIds.has(c.id) ? 'PRE_ACTIVATION' : null
  }));
}

/**
 * Backfill: إصدار كوبونات لأي أوردر مسلّم قديم لسه مفيش ليه كوبون
 * (بسبب مشاكل سابقة/خطأ جلب بيانات/نظام موقوف لفترة).
 * بيضمن إن النظام "يحسب تلقائياً ويتفعل" للأوردرات المسلّمة الناقصة.
 * مرشح: الأوردر المسلّم بعد تاريخ التفعيل ومفيش له كوبون أصلاً.
 */
async function backfillMissingVouchers(companyId, { limit = 50 } = {}) {
  const prisma = getSharedPrismaClient();
  if (!companyId) return { processed: 0, issued: 0, skipped: 0 };

  const active = await isAutoDiscountActive(companyId);
  if (!active) return { processed: 0, issued: 0, skipped: 0, reason: 'system_off' };

  const settings = await getSettings(companyId);
  const activatedAt = await getLoyaltyActivatedAt(companyId, settings);

  // الأوردرات المسلّمة
  const delivered = await prisma.order.findMany({
    where: {
      companyId,
      status: 'DELIVERED',
      customerId: { not: '' },
      ...(activatedAt ? { createdAt: { gte: activatedAt } } : {})
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, orderNumber: true, customerId: true, total: true, createdAt: true }
  });

  if (delivered.length === 0) return { processed: 0, issued: 0, skipped: 0 };

  // الأوردرات اللي ليها كوبون أصلاً
  const withVoucher = await prisma.customerLoyaltyVoucher.findMany({
    where: { companyId, sourceOrderId: { in: delivered.map(o => o.id) } },
    select: { sourceOrderId: true }
  });
  const withVoucherIds = new Set(withVoucher.map(v => v.sourceOrderId));

  let issued = 0;
  let skipped = 0;
  for (const order of delivered) {
    if (withVoucherIds.has(order.id)) { skipped++; continue; }

    const percent = Number(settings.discountPercent || 10);
    const amount = (Number(order.total || 0) * percent) / 100;
    const expiresAt = new Date(Date.now() + (Number(settings.validityDays || 3) * 24 * 60 * 60 * 1000));

    try {
      await prisma.customerLoyaltyVoucher.create({
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
      issued++;
    } catch (error) {
      console.error(`❌ [AUTO-DISCOUNT-BACKFILL] Failed for order ${order.orderNumber}:`, error.message);
      skipped++;
    }
  }

  if (issued > 0) {
    console.log(`✅ [AUTO-DISCOUNT-BACKFILL] Issued ${issued} vouchers for company ${companyId}`);
  }
  return { processed: delivered.length, issued, skipped };
}

/**
 * ⏰ إرسال تنبيه للعملاء قبل انتهاء صلاحية كوبون الخصم التلقائي.
 * يُستدعى من كرون يومي — يرسل مرة واحدة لكل كوبون (lastExpiryWarnedAt فارغ).
 * @param {Object} [options] — { hoursBefore } عدد الساعات قبل الانتهاء (افتراضي 24)
 */
async function sendExpiryWarnings({ hoursBefore = 24 } = {}) {
  const prisma = getSharedPrismaClient();
  const threshold = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
  const vouchers = await prisma.customerLoyaltyVoucher.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: threshold, gt: new Date() },
      lastExpiryWarnedAt: null
    }
  });

  let warned = 0;
  for (const v of vouchers) {
    try {
      const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
      const customer = await prisma.customer.findUnique({
        where: { id: v.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (!customer) continue;

      await sendCustomerNotification({
        companyId: v.companyId,
        eventType: 'AUTO_DISCOUNT_COUPON_EXPIRING',
        customer: {
          id: customer.id,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        },
        customerId: customer.id,
        variables: {
          discountPercent: String(Number(v.percent)),
          voucherAmount: String(Number(v.amount).toFixed(2)),
          expiryDate: v.expiresAt.toISOString().slice(0, 10),
          orderNumber: v.orderNumber || ''
        }
      });

      await prisma.customerLoyaltyVoucher.update({
        where: { id: v.id },
        data: { lastExpiryWarnedAt: new Date() }
      });
      warned++;
    } catch (error) {
      console.warn(`⚠️ [AUTO-DISCOUNT-NOTIF] Expiry warn failed for voucher ${v.id}:`, error.message);
    }
  }
  return { warned };
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  isAutoDiscountActive,
  isTiersActive,
  isLoyaltySystemActivated,
  updateSettings,
  updateLoyaltyConfig,
  issueVoucherForDeliveredOrder,
  getActiveVoucher,
  applyVoucherDiscount,
  markVoucherUsed,
  convertExpiredVouchers,
  reverseVoucherForOrder,
  restoreRedeemedPointsForOrder,
  getLoyaltyActivatedAt,
  getCustomerAutoDiscountStatus,
  getCustomerAutoDiscountSummary,
  getCustomerIdsByAutoDiscountStatus,
  mapVoucherToPublic,
  enrichCustomersWithAutoDiscountStatus,
  backfillMissingVouchers,
  sendExpiryWarnings
};
