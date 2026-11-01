/**
 * Order Discount Utility
 * Helper functions to resolve, compose, and format discount reasons for orders.
 */

function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * Resolves a human-readable discount reason from order data and metadata.
 * Prioritizes explicit discountReason, then identifies automatic sources (coupons, promotions, loyalty, wallet).
 *
 * @param {Object} order - Order or GuestOrder object
 * @param {Object|string} [orderMetadata] - Parsed metadata or raw JSON string
 * @returns {string|null} - Discount reason or null if no discount
 */
function resolveDiscountReason(order, orderMetadata) {
  if (!order) return null;
  const discountVal = Number(order.discount ?? order.discountAmount ?? 0);
  if (!discountVal || discountVal <= 0) return null;

  const meta = safeParseJson(orderMetadata ?? order.metadata, {});

  // 1. Explicit discount reason saved in metadata
  if (meta.discountReason && typeof meta.discountReason === 'string' && meta.discountReason.trim()) {
    return meta.discountReason.trim();
  }

  // 2. Coupon code
  const reasons = [];
  const couponCode = meta.coupon?.code || meta.couponCode || order.couponCode;
  if (couponCode) {
    const couponName = meta.coupon?.name ? ` (${meta.coupon.name})` : '';
    reasons.push(`كوبون: ${couponCode}${couponName}`);
  }

  // 3. Store Promotion
  if (meta.storePromotion && (meta.storePromotion.label || meta.storePromotion.discount > 0)) {
    reasons.push(meta.storePromotion.label || 'عرض المتجر');
  }

  // 4. Quantity offers
  if (Array.isArray(meta.quantityOffers) && meta.quantityOffers.length > 0) {
    const offerLabels = meta.quantityOffers
      .map(o => o.offerLabel || o.title)
      .filter(Boolean);
    if (offerLabels.length > 0) {
      reasons.push(`عرض كمية: ${offerLabels.join('، ')}`);
    } else {
      reasons.push('عرض كمية');
    }
  }

  // 5. Loyalty Tier
  if (meta.loyalty && (meta.loyalty.tierNameAr || meta.loyalty.tierName || meta.loyalty.discountPercent > 0)) {
    const tier = meta.loyalty.tierNameAr || meta.loyalty.tierName;
    const pct = meta.loyalty.discountPercent ? ` (${meta.loyalty.discountPercent}%)` : '';
    reasons.push(tier ? `مستوى الولاء: ${tier}${pct}` : `مكافأة الولاء${pct}`);
  }

  // 6. Auto-Discount Voucher
  if (meta.autoDiscount || meta.autoDiscountVoucherId) {
    reasons.push('كوبون خصم تلقائي');
  }

  // 7. Wallet / Electronic Payment Discount
  if (meta.walletDiscount && (meta.walletDiscount.discountAmount > 0 || meta.walletDiscount.percent > 0)) {
    const pct = meta.walletDiscount.percent ? ` (${meta.walletDiscount.percent}%)` : '';
    reasons.push(`خصم الدفع الإلكتروني${pct}`);
  }

  // 8. Points Redemption
  if (meta.pointsRedemption && (meta.pointsRedemption.value > 0 || meta.pointsRedemption.pointsUsed > 0)) {
    const pts = meta.pointsRedemption.pointsUsed ? ` (${meta.pointsRedemption.pointsUsed} نقطة)` : '';
    reasons.push(`استبدال نقاط الولاء${pts}`);
  }

  if (reasons.length > 0) {
    return reasons.join(' + ');
  }

  // Fallback: If discount > 0 without identified reason
  return 'خصم خاص';
}

/**
 * Builds a composite discount reason string from checkout components.
 *
 * @param {Object} params
 * @param {Object} [params.coupon]
 * @param {string} [params.promoLabel]
 * @param {number} [params.promoDiscount]
 * @param {string} [params.loyaltyTierTitle]
 * @param {number} [params.loyaltyDiscount]
 * @param {boolean} [params.hasAutoDiscount]
 * @param {number} [params.walletDiscountPercent]
 * @param {number} [params.walletDiscount]
 * @param {number} [params.pointsUsed]
 * @param {number} [params.pointsApplied]
 * @param {number} [params.totalDiscount]
 * @returns {string|null}
 */
function buildCompositeDiscountReason({
  coupon,
  promoLabel,
  promoDiscount,
  loyaltyTierTitle,
  loyaltyDiscount,
  hasAutoDiscount,
  walletDiscountPercent,
  walletDiscount,
  pointsUsed,
  pointsApplied,
  totalDiscount = 0
} = {}) {
  const reasons = [];

  if (coupon && coupon.code) {
    const namePart = coupon.name ? ` (${coupon.name})` : '';
    reasons.push(`كوبون: ${coupon.code}${namePart}`);
  }

  if (Number(promoDiscount) > 0 && promoLabel) {
    reasons.push(`عرض: ${promoLabel}`);
  }

  if (Number(loyaltyDiscount) > 0) {
    reasons.push(loyaltyTierTitle || 'مستوى الولاء');
  }

  if (hasAutoDiscount) {
    reasons.push('كوبون خصم تلقائي');
  }

  if (Number(walletDiscount) > 0) {
    const pctStr = walletDiscountPercent ? ` (${walletDiscountPercent}%)` : '';
    reasons.push(`خصم الدفع الإلكتروني${pctStr}`);
  }

  if (Number(pointsApplied) > 0) {
    const ptsStr = pointsUsed ? ` (${pointsUsed} نقطة)` : '';
    reasons.push(`استبدال نقاط${ptsStr}`);
  }

  if (reasons.length > 0) {
    return reasons.join(' + ');
  }

  return Number(totalDiscount) > 0 ? 'خصم خاص' : null;
}

/**
 * Unified checkout pricing resolver.
 * Single source of truth for computing subtotal, all discounts (coupon, store promotion, loyalty, electronic payment),
 * shipping adjustments (free shipping from coupons/offers/loyalty), and final order totals.
 * Used by both /public/orders and /kashier/checkout.
 *
 * @param {Object} params
 * @param {Object} [params.prisma] - Prisma client instance
 * @param {string} params.companyId - Company ID
 * @param {Array} [params.items] - Cart items or order items
 * @param {number} [params.subtotal] - Precomputed subtotal (optional)
 * @param {string} [params.couponCode] - Coupon code applied by customer
 * @param {string} [params.paymentMethod] - Payment method ('card', 'CREDIT_CARD', 'wallet', 'cod')
 * @param {string} [params.customerId] - Customer ID (optional)
 * @param {string} [params.customerPhone] - Customer phone (optional, used for loyalty lookup)
 * @param {number} [params.shippingCost] - Initial shipping cost
 * @param {Object} [params.shippingAddress] - Shipping address object
 * @param {Object} [params.company] - Pre-fetched Company object (optional)
 * @param {number} [params.appliedAdminDiscount] - Manual discount override (admin convert)
 * @param {boolean} [params.markVoucherUsed] - Whether to mark auto-discount voucher as used in DB (default false)
 * @returns {Promise<Object>} Pricing calculation result
 */
async function resolveCheckoutPricing({
  prisma: customPrisma,
  companyId,
  items = [],
  subtotal: inputSubtotal,
  couponCode,
  paymentMethod = 'cod',
  customerId,
  customerPhone,
  shippingCost: inputShippingCost = 0,
  shippingAddress = null,
  company: inputCompany = null,
  appliedAdminDiscount,
  markVoucherUsed = false,
  clientExplicitShipping = false,
} = {}) {
  let prisma = customPrisma;
  if (!prisma) {
    try {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      prisma = getSharedPrismaClient();
    } catch (_) {}
  }

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  // 1. Subtotal calculation
  let subtotal = 0;
  if (inputSubtotal !== undefined && inputSubtotal !== null && Number.isFinite(Number(inputSubtotal))) {
    subtotal = round2(Number(inputSubtotal));
  } else if (Array.isArray(items) && items.length > 0) {
    subtotal = round2(
      items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 1;
        const price =
          item.total !== undefined
            ? Number(item.total)
            : Number(item.price || item.basePrice || 0) * qty;
        return sum + price;
      }, 0)
    );
  }

  // 2. Shipping & free shipping adjustments
  let shippingCost = round2(Number(inputShippingCost) || 0);
  const originalShippingCost = shippingCost;
  let freeShippingAdjustment = null;

  const hasQuantityOfferFreeShipping =
    Array.isArray(items) &&
    items.some((item) => {
      const meta = safeParseJson(item.metadata, {});
      return Boolean(
        item.quantityOffer?.freeShipping ||
          meta.quantityOffer?.freeShipping ||
          meta.freeShipping
      );
    });

  if (hasQuantityOfferFreeShipping && shippingCost > 0) {
    freeShippingAdjustment = {
      source: 'quantity-offer',
      originalShippingCost,
      discountAmount: originalShippingCost,
      appliedShippingCost: 0,
    };
    shippingCost = 0;
  } else if (prisma && companyId && shippingCost > 0 && !clientExplicitShipping) {
    try {
      const { getConversionSuiteFreeShippingPromotion } = require('./storefrontFreeShipping');
      const conv = await getConversionSuiteFreeShippingPromotion(prisma, companyId, subtotal);
      if (conv?.eligible) {
        freeShippingAdjustment = {
          source: conv.source,
          threshold: conv.threshold,
          originalShippingCost,
          discountAmount: originalShippingCost,
          appliedShippingCost: 0,
        };
        shippingCost = 0;
      }
    } catch (_) {}
  }

  // 3. Coupon evaluation
  let discountAmount = 0;
  let couponDiscount = 0;
  let appliedCoupon = null;
  let couponFreeShipping = false;

  if (appliedAdminDiscount !== undefined && Number(appliedAdminDiscount) > 0) {
    discountAmount = round2(Number(appliedAdminDiscount));
  }

  const normalizedCouponCode = couponCode ? String(couponCode).trim().toUpperCase() : null;
  if (normalizedCouponCode && prisma && companyId) {
    try {
      const now = new Date();
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: normalizedCouponCode,
          companyId,
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now },
        },
      });

      if (coupon) {
        const usageLimitReached = Boolean(coupon.usageLimit && coupon.usageCount >= coupon.usageLimit);
        const minOrderMet = !coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount);

        if (!usageLimitReached && minOrderMet) {
          if (coupon.type === 'PERCENTAGE') {
            couponDiscount = (subtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscountAmount && couponDiscount > Number(coupon.maxDiscountAmount)) {
              couponDiscount = Number(coupon.maxDiscountAmount);
            }
          } else if (coupon.type === 'FREE_SHIPPING') {
            couponFreeShipping = true;
            couponDiscount = 0;
            if (shippingCost > 0) {
              freeShippingAdjustment = {
                source: 'coupon-free-shipping',
                threshold: 0,
                originalShippingCost,
                discountAmount: originalShippingCost,
                appliedShippingCost: 0,
              };
              shippingCost = 0;
            }
          } else {
            couponDiscount = Number(coupon.value);
          }
          couponDiscount = round2(Math.max(0, Math.min(subtotal, Number(couponDiscount))));
          appliedCoupon = coupon;
          discountAmount += couponDiscount;
        }
      }
    } catch (couponErr) {
      console.warn('⚠️ [CHECKOUT-PRICING] Coupon evaluation error:', couponErr?.message);
    }
  }

  // 4. Company Settings & Store Promotions
  let promoDiscount = 0;
  let promoLabel = '';
  let disableAutoDiscountsWithoutApproval = true;
  let requireDiscountApproval = true;

  try {
    let companySettingsRaw = inputCompany?.settings;
    if (!companySettingsRaw && prisma && companyId) {
      const compRow = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });
      companySettingsRaw = compRow?.settings;
    }
    const parsedSettings = safeParseJson(companySettingsRaw, {});
    if (parsedSettings.disableAutoDiscountsWithoutApproval !== undefined) {
      disableAutoDiscountsWithoutApproval = Boolean(parsedSettings.disableAutoDiscountsWithoutApproval);
    }
    if (parsedSettings.requireDiscountApproval !== undefined) {
      requireDiscountApproval = Boolean(parsedSettings.requireDiscountApproval);
    }
  } catch (_) {}

  if (!disableAutoDiscountsWithoutApproval && prisma && companyId) {
    try {
      const now = new Date();
      const storePromotion = await prisma.storePromotion.findFirst({
        where: {
          companyId,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      });

      if (storePromotion) {
        if (storePromotion.disableOtherDiscounts) {
          discountAmount = 0;
          couponDiscount = 0;
        }
        const { calculateDiscount: calcStorePromotionDiscount } = require('./storePromotionUtils');
        const promoCartItems = (items || []).map((i) => ({
          productId: i.productId || i.id,
          price: i.basePrice || i.price,
          comparePrice: i.comparePrice || 0,
          quantity: Number(i.quantity) || 1,
        }));
        const promoResult = calcStorePromotionDiscount({
          cartItems: promoCartItems,
          tiers: storePromotion.tiers,
          disableOtherDiscounts: storePromotion.disableOtherDiscounts,
        });
        promoDiscount = round2(Number(promoResult?.discount || 0));
        promoLabel = promoResult?.tier?.label || storePromotion.title || 'عرض الكمية';
        discountAmount += promoDiscount;
      }
    } catch (promoErr) {
      console.warn('⚠️ [CHECKOUT-PRICING] Store promotion evaluation error:', promoErr?.message);
    }
  }

  // 5. Loyalty Tier & Auto-Discount Vouchers
  let loyaltyDiscount = 0;
  let loyaltyRewards = null;
  let loyaltyTierInfo = null;
  let autoDiscountVoucherId = null;
  let resolvedCustomer = null;

  if (prisma && companyId && (customerId || customerPhone)) {
    try {
      if (customerId) {
        resolvedCustomer = await prisma.customer.findUnique({ where: { id: customerId } }).catch(() => null);
      }
      if (!resolvedCustomer && customerPhone) {
        const { findCustomerByPhone } = require('./customerIdentity');
        resolvedCustomer = await findCustomerByPhone(prisma, customerPhone, companyId).catch(() => null);
      }

      if (resolvedCustomer) {
        const autoDiscountService = require('../services/autoDiscountService');
        const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
        const loyaltySettings = await autoDiscountService.getSettings(companyId).catch(() => ({}));
        const autoActive =
          !disableAutoDiscountsWithoutApproval &&
          loyaltySettings.autoDiscountEnabled === true &&
          loyaltySettings.enabled !== false;
        const hasTiers = await prisma.customerLoyaltyTier.count({ where: { companyId } }).catch(() => 0);
        const tiersActive = loyaltySettings.tiersEnabled === true || hasTiers > 0;
        const discountCombination = loyaltySettings.discountCombination || 'ADDITIVE';
        const maxTotalDiscountPercent = Number(loyaltySettings.maxTotalDiscountPercent || 0);

        let tierDiscount = 0;
        let voucherDiscount = 0;

        if (tiersActive) {
          loyaltyRewards = await customerLoyaltyService.getCustomerActiveRewards(companyId, resolvedCustomer.id).catch(() => null);
          const progress = await customerLoyaltyService.getCustomerTierProgress(companyId, resolvedCustomer.id).catch(() => null);
          loyaltyTierInfo = progress?.tier || null;

          if (loyaltyRewards?.freeShipping && shippingCost > 0) {
            freeShippingAdjustment = {
              source: 'loyalty_tier',
              originalShippingCost,
              discountAmount: originalShippingCost,
              appliedShippingCost: 0,
            };
            shippingCost = 0;
          }

          const lp = Number(loyaltyRewards?.discountPercent || 0);
          if (lp > 0) {
            tierDiscount = (subtotal * lp) / 100;
          }
        }

        if (autoActive) {
          const voucherRes = await autoDiscountService.applyVoucherDiscount({
            companyId,
            customerId: resolvedCustomer.id,
            cartTotal: subtotal,
          }).catch(() => ({ discount: 0 }));
          if (voucherRes && voucherRes.discount > 0 && voucherRes.voucher) {
            voucherDiscount = Number(voucherRes.discount);
            autoDiscountVoucherId = voucherRes.voucher.id;
            if (markVoucherUsed) {
              await autoDiscountService.markVoucherUsed(voucherRes.voucher.id).catch(() => {});
            }
          }
        }

        const base = subtotal;
        let combined = 0;
        if (discountCombination === 'BEST') {
          combined = Math.max(tierDiscount, voucherDiscount);
        } else if (discountCombination === 'COMPOUND') {
          const tierPct = base > 0 ? (tierDiscount / base) * 100 : 0;
          const voucherPct = base > 0 ? (voucherDiscount / base) * 100 : 0;
          combined = base * (1 - (1 - tierPct / 100) * (1 - voucherPct / 100));
        } else {
          combined = tierDiscount + voucherDiscount;
        }

        if (maxTotalDiscountPercent > 0) {
          const capAmount = base * (maxTotalDiscountPercent / 100);
          if (combined > capAmount) combined = capAmount;
        }

        try {
          let couponAllowWithLoyalty = true;
          if (normalizedCouponCode && prisma.coupon) {
            const cp = await prisma.coupon.findFirst({
              where: { companyId, code: normalizedCouponCode },
            }).catch(() => null);
            if (cp) couponAllowWithLoyalty = cp.allowWithLoyalty !== false;
          }
          const capResult = await customerLoyaltyService.enforceDiscountCap({
            companyId,
            orderTotal: subtotal,
            couponDiscount: combined,
            walletAmount: 0,
            pointsAmount: 0,
            couponAllowWithLoyalty,
          });
          if (!capResult.loyaltyAllowed) {
            combined = capResult.couponDiscount;
          } else if (capResult.capped) {
            combined = capResult.cappedTotal;
          }
        } catch (capErr) {
          console.warn('⚠️ [CHECKOUT-PRICING] Loyalty discount cap check failed:', capErr?.message);
        }

        loyaltyDiscount = round2(combined);
        if (loyaltyDiscount > 0) {
          discountAmount += loyaltyDiscount;
        }
      }
    } catch (loyaltyErr) {
      console.warn('⚠️ [CHECKOUT-PRICING] Failed to calculate loyalty rewards:', loyaltyErr?.message);
    }
  }

  // 6. Electronic Payment Discount (Card / Wallet)
  let walletDiscount = 0;
  let walletDiscountPercent = 0;
  const normalizedPaymentMethod = String(paymentMethod || '').toLowerCase();
  const isCard = normalizedPaymentMethod === 'card' || normalizedPaymentMethod === 'credit_card';
  const isWallet = normalizedPaymentMethod === 'wallet';

  if ((isCard || isWallet) && prisma && companyId) {
    try {
      const sfSettingsRow = await prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { walletPaymentSettings: true, enabledPaymentMethods: true },
      });
      const walletSettings = safeParseJson(sfSettingsRow?.walletPaymentSettings, {});
      const rawMethods = sfSettingsRow?.enabledPaymentMethods;
      const enabledMethods =
        typeof rawMethods === 'string'
          ? safeParseJson(rawMethods, ['cod'])
          : Array.isArray(rawMethods)
          ? rawMethods
          : ['cod'];

      const isWalletActive =
        walletSettings?.enabled !== false &&
        (Array.isArray(enabledMethods) ? enabledMethods.includes('wallet') : true) &&
        Boolean(walletSettings?.walletNumber?.trim());

      const discountEnabled =
        walletSettings?.discountEnabled === true ||
        walletSettings?.discountEnabled === 'true';
      const percent = Math.max(0, Number(walletSettings?.discountPercent || 0));

      if (discountEnabled && percent > 0 && (isCard || isWalletActive)) {
        walletDiscountPercent = percent;
        walletDiscount = round2((subtotal * percent) / 100);
        discountAmount += walletDiscount;
        console.log(
          `🎁 [CHECKOUT-PRICING] Electronic discount applied: ${walletDiscount} EGP (${percent}% of subtotal ${subtotal}) for paymentMethod=${paymentMethod}`
        );
      }
    } catch (walletDiscountErr) {
      console.warn('⚠️ [CHECKOUT-PRICING] Failed to apply wallet/electronic discount:', walletDiscountErr?.message);
    }
  }

  // 7. Totals & Capping
  discountAmount = round2(Math.min(subtotal, Math.max(0, discountAmount)));
  const finalTotal = round2(Math.max(0, subtotal + shippingCost - discountAmount));

  const compositeReason = buildCompositeDiscountReason({
    coupon: appliedCoupon,
    promoLabel,
    promoDiscount,
    loyaltyTierTitle: loyaltyTierInfo?.nameAr || loyaltyTierInfo?.name,
    loyaltyDiscount,
    hasAutoDiscount: Boolean(autoDiscountVoucherId),
    walletDiscountPercent,
    walletDiscount,
    pointsUsed: 0,
    pointsApplied: 0,
    totalDiscount: discountAmount,
  });

  const orderMetadata = {};
  if (freeShippingAdjustment) {
    orderMetadata.freeShipping = freeShippingAdjustment;
  }
  if (loyaltyDiscount > 0 || loyaltyTierInfo) {
    orderMetadata.loyalty = {
      tierName: loyaltyTierInfo?.name || loyaltyTierInfo?.nameAr || null,
      tierNameAr: loyaltyTierInfo?.nameAr || null,
      discountPercent: Number(loyaltyRewards?.discountPercent || 0),
      discountAmount: loyaltyDiscount,
      freeShipping: Boolean(loyaltyRewards?.freeShipping),
    };
  }
  if (walletDiscount > 0) {
    orderMetadata.walletDiscount = {
      percent: walletDiscountPercent,
      discountAmount: walletDiscount,
    };
  }
  if (autoDiscountVoucherId) {
    orderMetadata.autoDiscount = {
      usedVoucherId: autoDiscountVoucherId,
      discountAmount: loyaltyDiscount,
      appliedAt: new Date().toISOString(),
    };
  }
  if (appliedCoupon) {
    orderMetadata.coupon = {
      code: appliedCoupon.code,
      name: appliedCoupon.name || null,
      type: appliedCoupon.type,
      value: appliedCoupon.value,
      discountAmount: couponDiscount,
    };
    orderMetadata.couponCode = appliedCoupon.code;
  }
  if (promoDiscount > 0) {
    orderMetadata.storePromotion = {
      discount: promoDiscount,
      label: promoLabel,
    };
  }
  if (discountAmount > 0) {
    orderMetadata.discountReason = compositeReason;
    if (requireDiscountApproval && !appliedAdminDiscount) {
      orderMetadata.needsDiscountApproval = true;
      orderMetadata.discountApprovalStatus = 'PENDING_APPROVAL';
      orderMetadata.discountApprovalRequestedAt = new Date().toISOString();
    }
  }

  return {
    subtotal,
    shipping: shippingCost,
    shippingCost,
    originalShippingCost,
    freeShippingAdjustment,

    couponDiscount,
    appliedCoupon,
    couponFreeShipping,

    storePromotionDiscount: promoDiscount,
    offersDiscount: promoDiscount,
    promoDiscount,
    promoLabel,
    offersLabel: promoLabel,

    loyaltyDiscount,
    loyaltyTierInfo,
    loyaltyRewards,
    autoDiscountVoucherId,

    electronicDiscount: walletDiscount,
    electronicDiscountPercent: walletDiscountPercent,
    walletDiscount,
    walletDiscountPercent,

    discountAmount,
    totalDiscount: discountAmount,
    finalTotal,
    total: finalTotal,

    reasons: compositeReason,
    discountReason: compositeReason,
    breakdown: {
      coupon: couponDiscount,
      storePromotion: promoDiscount,
      loyalty: loyaltyDiscount,
      electronic: walletDiscount,
    },
    orderMetadata,
  };
}

module.exports = {
  resolveDiscountReason,
  buildCompositeDiscountReason,
  safeParseJson,
  resolveCheckoutPricing,
};
