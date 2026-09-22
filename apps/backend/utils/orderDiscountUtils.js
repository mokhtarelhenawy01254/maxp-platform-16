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

module.exports = {
  resolveDiscountReason,
  buildCompositeDiscountReason,
  safeParseJson,
};
