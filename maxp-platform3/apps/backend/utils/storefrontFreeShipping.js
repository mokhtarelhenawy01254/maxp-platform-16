const { sanitizeMarketplaceAppSettings } = require('./marketplaceAppSettings');

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toPositiveAmount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildDisabledPromotion = (threshold = 0, subtotal = 0) => ({
  enabled: false,
  eligible: false,
  threshold,
  remaining: threshold > 0 ? Math.max(threshold - Math.max(0, Number(subtotal) || 0), 0) : 0,
  source: 'conversion-suite',
});

const resolveConversionSuiteFreeShippingPromotion = ({
  rawSettings,
  subtotal,
  appEnabled = true,
} = {}) => {
  const settings = sanitizeMarketplaceAppSettings('conversion-suite', rawSettings);
  const general = isRecord(settings.general) ? settings.general : {};
  const modules = isRecord(settings.modules) ? settings.modules : {};
  const thresholds = isRecord(settings.thresholds) ? settings.thresholds : {};
  const threshold = toPositiveAmount(thresholds.freeShippingAmount, 0);
  const normalizedSubtotal = Math.max(0, Number(subtotal) || 0);
  const enabled =
    Boolean(appEnabled) &&
    general.enabled !== false &&
    modules.freeShippingBar !== false &&
    threshold > 0;

  if (!enabled) {
    return buildDisabledPromotion(threshold, normalizedSubtotal);
  }

  return {
    enabled: true,
    eligible: normalizedSubtotal >= threshold,
    threshold,
    remaining: Math.max(threshold - normalizedSubtotal, 0),
    source: 'conversion-suite',
  };
};

const getConversionSuiteFreeShippingPromotion = async (prisma, companyId, subtotal) => {
  if (!prisma || !companyId) {
    return buildDisabledPromotion(0, subtotal);
  }

  const companyApp = await prisma.companyApp.findFirst({
    where: {
      companyId,
      status: { in: ['TRIAL', 'ACTIVE'] },
      app: {
        slug: 'conversion-suite',
      },
    },
    select: {
      settings: true,
      status: true,
    },
  });

  if (!companyApp) {
    return buildDisabledPromotion(0, subtotal);
  }

  return resolveConversionSuiteFreeShippingPromotion({
    rawSettings: companyApp.settings,
    subtotal,
    appEnabled: companyApp.status === 'TRIAL' || companyApp.status === 'ACTIVE',
  });
};

module.exports = {
  resolveConversionSuiteFreeShippingPromotion,
  getConversionSuiteFreeShippingPromotion,
};
