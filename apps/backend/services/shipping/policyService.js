/**
 * Shipping Policy & Pricing Engine (SHIP-W1A)
 * Handles company shipping policies, client rate cards, and dynamic price quotes
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { normalizeGovernorateName } = require('../../utils/orderLocationNormalizer');
const { resolveShippingQuoteForGovernorate } = require('../../controller/shippingZoneController');

const DEFAULT_POLICY_SETTINGS = {
  operatingModel: 'INTERNAL',
  codSettlementMode: 'STATEMENT_WITH_REMITTANCE',
  intakeMode: 'MIXED',
  pricingBasis: 'ZONE_WEIGHT',
  codFeeType: 'FIXED',
  deliveryAttempts: 3,
  attemptIntervalHours: 24,
  afterAttemptsAction: 'REVIEW',
  proofOfDelivery: 'OTP,PIN',
  requirePinOnShareLink: true,
  publicTrackingMode: 'WAYBILL',
  publicTrackingMask: true,
  clientPortalEnabled: true,
  courierPortalEnabled: true,
  offlineEnabled: true,
  maxWeightKg: null,
  maxCodAmount: null,
  currency: 'EGP',
  invoiceVatPercent: 0,
};

/**
 * Get company shipping policy settings (or defaults if not yet created)
 * @param {string} companyId
 * @param {Object} [customPrisma]
 * @returns {Promise<Object>}
 */
async function getPolicy(companyId, customPrisma = null) {
  if (!companyId) return { ...DEFAULT_POLICY_SETTINGS, companyId: null };
  const prisma = customPrisma || getSharedPrismaClient();

  const policy = await prisma.shippingPolicySettings.findUnique({
    where: { companyId },
  });

  if (!policy) {
    return {
      id: null,
      companyId,
      ...DEFAULT_POLICY_SETTINGS,
      createdAt: null,
      updatedAt: null,
    };
  }

  return policy;
}

/**
 * Calculate shipping quote for a shipment
 * 1. Checks active ClientRateCard for merchant + normalized governorate (or general fallback)
 * 2. Falls back to company ShippingZone
 * 3. Returns { price, currency, source: 'RATE_CARD'|'ZONE'|'NONE', breakdown }
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.merchantId]
 * @param {string} params.governorate
 * @param {number} [params.weightKg=1]
 * @param {number} [params.codAmount=0]
 * @param {Object} [params.prisma]
 * @returns {Promise<Object>}
 */
async function quotePrice({
  companyId,
  merchantId = null,
  governorate,
  weightKg = 1,
  codAmount = 0,
  prisma = null,
}) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب لاحتساب سعر الشحن');
    err.statusCode = 400;
    throw err;
  }

  const normalizedGov = normalizeGovernorateName(governorate);
  if (!normalizedGov) {
    const err = new Error('المحافظة غير صالحة أو غير محددة');
    err.statusCode = 400;
    throw err;
  }

  const db = prisma || getSharedPrismaClient();
  const weight = Math.max(0.1, Number(weightKg || 1));
  const cod = Math.max(0, Number(codAmount || 0));

  // 1. Check for Active ClientRateCard
  if (merchantId) {
    const rateCards = await db.clientRateCard.findMany({
      where: {
        companyId,
        merchantId,
        isActive: true,
        OR: [
          { governorateCode: normalizedGov },
          { governorateCode: null },
        ],
      },
      orderBy: [
        { governorateCode: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const card = rateCards.find((c) => c.governorateCode === normalizedGov) || rateCards.find((c) => !c.governorateCode);

    if (card) {
      const basePrice = Number(card.basePrice);
      const baseWeight = Number(card.baseWeightKg || 1.0);
      const extraKgPrice = Number(card.extraKgPrice || 0);

      const extraWeight = Math.max(0, weight - baseWeight);
      // SHIP-H1: Extra weight rounded UP (ceil) to nearest whole kg with floating-point epsilon protection
      let extraUnits = 0;
      if (weight > baseWeight) {
        extraUnits = Math.ceil(Math.max(0, weight - baseWeight) - 1e-9);
      }
      const extraWeightFee = extraUnits * extraKgPrice;

      let codFee = 0;
      if (cod > 0) {
        const fixed = Number(card.codFeeFixed || 0);
        const pct = Number(card.codFeePercent || 0);
        codFee = fixed + (cod * pct) / 100;
      }

      const totalPrice = Number((basePrice + extraWeightFee + codFee).toFixed(2));

      return {
        price: totalPrice,
        currency: 'EGP',
        source: 'RATE_CARD',
        rateCardId: card.id,
        rateCardName: card.name,
        governorate: normalizedGov,
        breakdown: {
          basePrice,
          baseWeightKg: baseWeight,
          actualWeightKg: weight,
          extraWeightKg: extraWeight,
          extraUnits,
          extraKgPrice,
          extraWeightFee,
          codAmount: cod,
          codFee,
          total: totalPrice,
        },
      };
    }
  }

  // 2. Fallback to ShippingZone
  const zoneQuote = await resolveShippingQuoteForGovernorate(companyId, normalizedGov);
  if (zoneQuote && zoneQuote.zoneId) {
    const price = Number(zoneQuote.price || 0);
    return {
      price,
      currency: 'EGP',
      source: 'ZONE',
      zoneId: zoneQuote.zoneId,
      governorate: normalizedGov,
      deliveryTime: zoneQuote.deliveryTime || null,
      breakdown: {
        basePrice: price,
        total: price,
      },
    };
  }

  // 3. Neither RateCard nor Zone covers this governorate
  const err = new Error(`المحافظة غير مغطاة في مناطق الشحن أو بطاقات الأسعار: ${normalizedGov}`);
  err.statusCode = 400;
  throw err;
}

module.exports = {
  getPolicy,
  quotePrice,
  DEFAULT_POLICY_SETTINGS,
};
