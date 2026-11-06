/**
 * Shipping Policy & Pricing Engine (SHIP-W1A & SHIP-W14)
 * Handles company shipping policies, client rate cards, volume packages, and dynamic city/governorate price quotes
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
  allowIncompleteStatus: true,
  allowPostponedStatus: true,
  allowReshippedStatus: true,
  printFeePerWaybill: 0,
  openPackageMode: 'ALWAYS_ALLOW',
  openPackageFeeAlways: null,
  openPackageFeeAsk: null,
  openPackageFeeDeny: null,
};

/**
 * Normalizes city names for fuzzy/accent-insensitive matching
 */
function normalizeCity(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Arabic diacritics + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\w\u0600-\u06FF\s]/g, '') // remove special symbols
    .replace(/\s+/g, ' ');
}

/**
 * Checks if two city strings match (exact or significant substring)
 */
function isCityMatch(candidate, target) {
  if (!candidate || !target) return false;
  const c = normalizeCity(candidate);
  const t = normalizeCity(target);
  if (!c || !t) return false;
  if (c === t) return true;
  if (c.length >= 3 && t.length >= 3) {
    if (c.includes(t) || t.includes(c)) return true;
  }
  return false;
}

/**
 * Parses JSON or comma-separated lists safely
 */
function parseList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return trimmed.split(/[,،]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Calculates rate card formula price (base + extra kg + cod fee)
 */
function computeRateCardPrice(card, weight, cod) {
  const basePrice = Number(card.basePrice);
  const baseWeight = Number(card.baseWeightKg || 1.0);
  const extraKgPrice = Number(card.extraKgPrice || 0);

  const extraWeight = Math.max(0, weight - baseWeight);
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
    totalPrice,
    basePrice,
    baseWeight,
    extraWeight,
    extraUnits,
    extraKgPrice,
    extraWeightFee,
    codFee,
  };
}

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
 * Calculate shipping quote for a shipment (SHIP-W14)
 * Priority order:
 * 0. Active ClientPricingPackage (if destination city/governorate is covered)
 * 1. بطاقة العميل (مدينة) -> RATE_CARD_CITY
 * 2. بطاقة العميل (محافظة) -> RATE_CARD_GOV (source: RATE_CARD)
 * 3. منطقة (مدينة) -> ZONE_CITY
 * 4. منطقة (محافظة) -> ZONE_GOV (source: ZONE)
 * 5. Reject if neither covers destination
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.merchantId]
 * @param {string} params.governorate
 * @param {string} [params.city]
 * @param {string} [params.destinationCity]
 * @param {number} [params.weightKg=1]
 * @param {number} [params.codAmount=0]
 * @param {Object} [params.prisma]
 * @returns {Promise<Object>}
 */
async function quotePrice({
  companyId,
  merchantId = null,
  governorate,
  city = null,
  destinationCity = null,
  weightKg = 1,
  codAmount = 0,
  prisma = null,
}) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب لاحتساب سعر الشحن');
    err.statusCode = 400;
    throw err;
  }

  const rawCity = destinationCity || city || null;
  const targetCity = rawCity ? String(rawCity).trim() : null;

  const normalizedGov = normalizeGovernorateName(governorate, targetCity);
  if (!normalizedGov && !targetCity) {
    const err = new Error('المحافظة غير صالحة أو غير محددة');
    err.statusCode = 400;
    throw err;
  }

  const db = prisma || getSharedPrismaClient();
  const weight = Math.max(0.1, Number(weightKg || 1));
  const cod = Math.max(0, Number(codAmount || 0));

  // -------------------------------------------------------------------------
  // 0. Check for Active Client Monthly Package (ClientPricingPackage)
  // -------------------------------------------------------------------------
  if (merchantId && db.clientPricingPackage) {
    const clientPackage = await db.clientPricingPackage.findFirst({
      where: {
        companyId,
        merchantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (clientPackage) {
      const mode = clientPackage.coverageMode || 'BOTH';
      const pkgCities = parseList(clientPackage.cities);
      const pkgGovs = parseList(clientPackage.governorates);

      let isCityCovered = false;
      if (targetCity && (mode === 'CITIES' || mode === 'BOTH')) {
        isCityCovered = pkgCities.some((c) => isCityMatch(c, targetCity));
      }

      let isGovCovered = false;
      if (normalizedGov && (mode === 'GOVERNORATES' || mode === 'BOTH')) {
        isGovCovered = pkgGovs.some((g) => normalizeGovernorateName(g) === normalizedGov);
      }

      // If coverageMode is GOVERNORATES and city is not specified or not in list, gov match applies
      if (isCityCovered || isGovCovered) {
        const matchedSource = isCityCovered ? 'PACKAGE_CITY' : 'PACKAGE_GOV';

        // Count non-cancelled shipments created in the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const currentMonthCount = await db.shipment.count({
          where: {
            companyId,
            merchantId,
            status: { notIn: ['CANCELLED'] },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        const limit = clientPackage.monthlyVolumeTo !== null && clientPackage.monthlyVolumeTo !== undefined
          ? Number(clientPackage.monthlyVolumeTo)
          : null;

        const isOverage = Boolean(limit && currentMonthCount >= limit);
        const overageCount = isOverage ? currentMonthCount + 1 - limit : 0;

        let finalPrice = 0;
        if (isOverage) {
          finalPrice = Number(clientPackage.overagePricePerShipment ?? clientPackage.perShipmentPrice ?? 0);
        } else if (clientPackage.pricingMode === 'PACKAGE_FLAT') {
          // Flat monthly subscription includes up to limit at 0 additional per-shipment cost
          finalPrice = 0;
        } else {
          finalPrice = Number(clientPackage.perShipmentPrice || 0);
        }

        return {
          price: Number(finalPrice.toFixed(2)),
          currency: 'EGP',
          source: matchedSource,
          priceSource: matchedSource,
          packageId: clientPackage.id,
          packageName: clientPackage.name,
          pricingMode: clientPackage.pricingMode,
          flatMonthlyPrice: clientPackage.flatMonthlyPrice ? Number(clientPackage.flatMonthlyPrice) : null,
          perShipmentPrice: clientPackage.perShipmentPrice ? Number(clientPackage.perShipmentPrice) : null,
          governorate: normalizedGov,
          city: targetCity || null,
          isOverage,
          overage: overageCount,
          currentMonthShipmentCount: currentMonthCount,
          monthlyVolumeTo: limit,
          breakdown: {
            basePrice: finalPrice,
            pricingMode: clientPackage.pricingMode,
            flatMonthlyPrice: clientPackage.flatMonthlyPrice ? Number(clientPackage.flatMonthlyPrice) : null,
            perShipmentPrice: clientPackage.perShipmentPrice ? Number(clientPackage.perShipmentPrice) : null,
            overagePricePerShipment: clientPackage.overagePricePerShipment ? Number(clientPackage.overagePricePerShipment) : null,
            isOverage,
            overage: overageCount,
            currentMonthShipmentCount: currentMonthCount,
            monthlyVolumeTo: limit,
            total: finalPrice,
          },
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 1. بطاقة العميل (مدينة) -> RATE_CARD_CITY
  // -------------------------------------------------------------------------
  if (merchantId && targetCity) {
    const cityCards = await db.clientRateCard.findMany({
      where: {
        companyId,
        merchantId,
        isActive: true,
        OR: [
          { cityName: { not: null } },
          { cities: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchedCityCard = cityCards.find((c) => {
      if (c.cityName && isCityMatch(c.cityName, targetCity)) return true;
      if (c.cities) {
        const list = parseList(c.cities);
        if (list.some((item) => isCityMatch(item, targetCity))) return true;
      }
      return false;
    });

    if (matchedCityCard) {
      const calc = computeRateCardPrice(matchedCityCard, weight, cod);
      return {
        price: calc.totalPrice,
        currency: 'EGP',
        source: 'RATE_CARD_CITY',
        priceSource: 'RATE_CARD_CITY',
        rateCardId: matchedCityCard.id,
        rateCardName: matchedCityCard.name,
        governorate: normalizedGov,
        city: targetCity,
        breakdown: {
          basePrice: calc.basePrice,
          baseWeightKg: calc.baseWeight,
          actualWeightKg: weight,
          extraWeightKg: calc.extraWeight,
          extraUnits: calc.extraUnits,
          extraKgPrice: calc.extraKgPrice,
          extraWeightFee: calc.extraWeightFee,
          codAmount: cod,
          codFee: calc.codFee,
          total: calc.totalPrice,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. بطاقة العميل (محافظة) -> RATE_CARD_GOV (source: RATE_CARD)
  // -------------------------------------------------------------------------
  if (merchantId) {
    const rateCards = await db.clientRateCard.findMany({
      where: {
        companyId,
        merchantId,
        isActive: true,
        OR: [
          ...(normalizedGov ? [{ governorateCode: normalizedGov }] : []),
          { governorateCode: null },
        ],
      },
      orderBy: [
        { governorateCode: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Exclude cards specifically scoped to a different city when city doesn't match
    const govCard = rateCards.find((c) => {
      if (normalizedGov && c.governorateCode === normalizedGov) return true;
      if (!c.governorateCode && !c.cityName && !c.cities) return true;
      return false;
    });

    if (govCard) {
      const calc = computeRateCardPrice(govCard, weight, cod);
      return {
        price: calc.totalPrice,
        currency: 'EGP',
        source: 'RATE_CARD',
        priceSource: 'RATE_CARD_GOV',
        rateCardId: govCard.id,
        rateCardName: govCard.name,
        governorate: normalizedGov,
        city: targetCity || null,
        breakdown: {
          basePrice: calc.basePrice,
          baseWeightKg: calc.baseWeight,
          actualWeightKg: weight,
          extraWeightKg: calc.extraWeight,
          extraUnits: calc.extraUnits,
          extraKgPrice: calc.extraKgPrice,
          extraWeightFee: calc.extraWeightFee,
          codAmount: cod,
          codFee: calc.codFee,
          total: calc.totalPrice,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. منطقة (مدينة) -> ZONE_CITY
  // -------------------------------------------------------------------------
  if (targetCity) {
    const cityZones = await db.shippingZone.findMany({
      where: {
        companyId,
        isActive: true,
        cities: { not: null },
      },
    });

    const matchedCityZone = cityZones.find((z) => {
      const list = parseList(z.cities);
      return list.some((item) => isCityMatch(item, targetCity));
    });

    if (matchedCityZone) {
      const price = Number(matchedCityZone.price || 0);
      return {
        price,
        currency: 'EGP',
        source: 'ZONE_CITY',
        priceSource: 'ZONE_CITY',
        zoneId: matchedCityZone.id,
        zoneName: matchedCityZone.name,
        governorate: normalizedGov,
        city: targetCity,
        deliveryTime: matchedCityZone.deliveryTime || null,
        breakdown: {
          basePrice: price,
          total: price,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // 4. منطقة (محافظة) -> ZONE_GOV (source: ZONE)
  // -------------------------------------------------------------------------
  if (normalizedGov) {
    const zoneQuote = await resolveShippingQuoteForGovernorate(companyId, normalizedGov);
    if (zoneQuote && zoneQuote.zoneId) {
      const price = Number(zoneQuote.price || 0);
      return {
        price,
        currency: 'EGP',
        source: 'ZONE',
        priceSource: 'ZONE_GOV',
        zoneId: zoneQuote.zoneId,
        governorate: normalizedGov,
        city: targetCity || null,
        deliveryTime: zoneQuote.deliveryTime || null,
        breakdown: {
          basePrice: price,
          total: price,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // 5. Neither RateCard nor Zone covers this destination -> Reject
  // -------------------------------------------------------------------------
  const locationLabel = [targetCity, normalizedGov || governorate].filter(Boolean).join(' - ');
  const err = new Error(`المحافظة أو المدينة غير مغطاة في مناطق الشحن أو بطاقات الأسعار: ${locationLabel}`);
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
  'allowIncompleteStatus',
  'allowPostponedStatus',
  'allowReshippedStatus',
  'printFeePerWaybill',
  'openPackageMode',
  'openPackageFeeAlways',
  'openPackageFeeAsk',
  'openPackageFeeDeny',
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
  if (payload.allowIncompleteStatus !== undefined) {
    sanitized.allowIncompleteStatus = Boolean(payload.allowIncompleteStatus);
  }
  if (payload.allowPostponedStatus !== undefined) {
    sanitized.allowPostponedStatus = Boolean(payload.allowPostponedStatus);
  }
  if (payload.allowReshippedStatus !== undefined) {
    sanitized.allowReshippedStatus = Boolean(payload.allowReshippedStatus);
  }
  if (payload.printFeePerWaybill !== undefined) {
    sanitized.printFeePerWaybill = payload.printFeePerWaybill !== null && payload.printFeePerWaybill !== '' ? Math.max(0, parseFloat(payload.printFeePerWaybill) || 0) : 0;
  }
  if (payload.openPackageMode !== undefined) {
    const validModes = ['ALWAYS_ALLOW', 'ASK_EACH', 'ALWAYS_DENY'];
    const mode = String(payload.openPackageMode || '').toUpperCase();
    sanitized.openPackageMode = validModes.includes(mode) ? mode : 'ALWAYS_ALLOW';
  }
  if (payload.openPackageFeeAlways !== undefined) {
    sanitized.openPackageFeeAlways = payload.openPackageFeeAlways !== null && payload.openPackageFeeAlways !== '' ? Math.max(0, parseFloat(payload.openPackageFeeAlways) || 0) : null;
  }
  if (payload.openPackageFeeAsk !== undefined) {
    sanitized.openPackageFeeAsk = payload.openPackageFeeAsk !== null && payload.openPackageFeeAsk !== '' ? Math.max(0, parseFloat(payload.openPackageFeeAsk) || 0) : null;
  }
  if (payload.openPackageFeeDeny !== undefined) {
    sanitized.openPackageFeeDeny = payload.openPackageFeeDeny !== null && payload.openPackageFeeDeny !== '' ? Math.max(0, parseFloat(payload.openPackageFeeDeny) || 0) : null;
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
  normalizeCity,
  isCityMatch,
  parseList,
};
