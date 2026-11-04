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
  maxShipmentsPerCourierPerDay: 60,
  requireDeliveryOtp: false,
  rtoChargeReturnLeg: false,
  rtoReturnLegPrice: null,
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

const ALLOWED_POLICY_KEYS = [
  'deliveryAttempts',
  'attemptIntervalHours',
  'afterAttemptsAction',
  'codSettlementMode',
  'proofOfDelivery',
  'publicTrackingMode',
  'clientPortalEnabled',
  'courierPortalEnabled',
  'offlineEnabled',
  'maxShipmentsPerCourierPerDay',
  'maxWeightKg',
  'maxCodAmount',
  'invoiceVatPercent',
  'requireDeliveryOtp',
  'rtoChargeReturnLeg',
  'rtoReturnLegPrice',
];

/**
 * Update company shipping policy settings partially
 * @param {string} companyId
 * @param {Object} payload
 * @param {Object} [customPrisma]
 * @returns {Promise<Object>}
 */
async function updatePolicy(companyId, payload = {}, customPrisma = null) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب لتحديث السياسة');
    err.statusCode = 400;
    throw err;
  }

  const keys = Object.keys(payload || {});
  const invalidKeys = keys.filter((k) => !ALLOWED_POLICY_KEYS.includes(k));
  if (invalidKeys.length > 0) {
    const err = new Error('مفاتيح غير مسموح بها في إعدادات السياسة: ' + invalidKeys.join(', '));
    err.statusCode = 400;
    err.code = 'INVALID_POLICY_KEY';
    throw err;
  }

  const prisma = customPrisma || getSharedPrismaClient();

  const sanitized = {};
  if (payload.deliveryAttempts !== undefined) {
    sanitized.deliveryAttempts = Math.max(1, parseInt(payload.deliveryAttempts, 10) || 3);
  }
  if (payload.attemptIntervalHours !== undefined) {
    sanitized.attemptIntervalHours = Math.max(0, parseInt(payload.attemptIntervalHours, 10) || 0);
  }
  if (payload.afterAttemptsAction !== undefined) {
    const action = String(payload.afterAttemptsAction).trim().toUpperCase();
    if (!['RTO', 'AUTO_RTO', 'REVIEW'].includes(action)) {
      const err = new Error('إجراء ما بعد المحاولات يجب أن يكون RTO أو REVIEW');
      err.statusCode = 400;
      throw err;
    }
    sanitized.afterAttemptsAction = action === 'AUTO_RTO' ? 'RTO' : action;
  }
  if (payload.codSettlementMode !== undefined) {
    sanitized.codSettlementMode = String(payload.codSettlementMode).trim();
  }
  if (payload.proofOfDelivery !== undefined) {
    sanitized.proofOfDelivery = String(payload.proofOfDelivery).trim();
  }
  if (payload.publicTrackingMode !== undefined) {
    sanitized.publicTrackingMode = String(payload.publicTrackingMode).trim();
  }
  if (payload.clientPortalEnabled !== undefined) {
    sanitized.clientPortalEnabled = Boolean(payload.clientPortalEnabled);
  }
  if (payload.courierPortalEnabled !== undefined) {
    sanitized.courierPortalEnabled = Boolean(payload.courierPortalEnabled);
  }
  if (payload.offlineEnabled !== undefined) {
    sanitized.offlineEnabled = Boolean(payload.offlineEnabled);
  }
  if (payload.maxShipmentsPerCourierPerDay !== undefined) {
    sanitized.maxShipmentsPerCourierPerDay = Math.max(1, parseInt(payload.maxShipmentsPerCourierPerDay, 10) || 60);
  }
  if (payload.maxWeightKg !== undefined) {
    sanitized.maxWeightKg = payload.maxWeightKg !== null ? parseFloat(payload.maxWeightKg) : null;
  }
  if (payload.maxCodAmount !== undefined) {
    sanitized.maxCodAmount = payload.maxCodAmount !== null ? parseFloat(payload.maxCodAmount) : null;
  }
  if (payload.requireDeliveryOtp !== undefined) {
    sanitized.requireDeliveryOtp = Boolean(payload.requireDeliveryOtp);
  }
  if (payload.rtoChargeReturnLeg !== undefined) {
    sanitized.rtoChargeReturnLeg = Boolean(payload.rtoChargeReturnLeg);
  }
  if (payload.rtoReturnLegPrice !== undefined) {
    sanitized.rtoReturnLegPrice = payload.rtoReturnLegPrice !== null && payload.rtoReturnLegPrice !== '' ? parseFloat(payload.rtoReturnLegPrice) : null;
  }
  if (payload.invoiceVatPercent !== undefined) {
    sanitized.invoiceVatPercent = Math.max(0, parseFloat(payload.invoiceVatPercent) || 0);
  }

  const updated = await prisma.shippingPolicySettings.upsert({
    where: { companyId },
    update: sanitized,
    create: {
      companyId,
      ...DEFAULT_POLICY_SETTINGS,
      ...sanitized,
    },
  });

  return updated;
}

module.exports = {
  getPolicy,
  updatePolicy,
  quotePrice,
  DEFAULT_POLICY_SETTINGS,
  ALLOWED_POLICY_KEYS,
};
