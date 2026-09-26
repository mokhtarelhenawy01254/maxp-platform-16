const { getSharedPrismaClientAsync, safeQuery } = require('../services/sharedDatabase');
const { trackStorefrontAppUsage } = require('../services/storefrontAppUsageService');
const {
  storefrontThemeCatalogService,
} = require('../services/storefrontThemeCatalogService');
const { sanitizeMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');
const redisCacheService = require('../services/redisCacheService');
const { getClientIp, resolveIpLocation, isLocalOrPrivateIp } = require('../utils/ipGeoLookup');

const DEFAULT_THEME_ID = 'modern-minimal';
const PUBLIC_MARKETPLACE_APP_SLUGS = [
  'conversion-suite',
  'ugc-reviews-pro',
  'commerce-advanced',
  'quantity-offers-pro',
];
const PUBLIC_STOREFRONT_SETTINGS_FIELDS = [
  'supportedLanguages',
  'designTokens',
  'quickViewEnabled',
  'comparisonEnabled',
  'wishlistEnabled',
  'recentlyViewedEnabled',
  'advancedFiltersEnabled',
  'productCardStyle',
  'gridAddToCartIcon',
  'gridDiscountBanner',
  'gtmEnabled',
  'gtmContainerId',
  'gtmDataLayerEnabled',
  'gtmTrackPageView',
  'gtmSuppressPixels',
  'googleAnalyticsEnabled',
  'googleAnalyticsMeasurementId',
  'googleAnalyticsTrackPageView',
  'googleAnalyticsTrackViewContent',
  'googleAnalyticsTrackAddToCart',
  'googleAnalyticsTrackInitiateCheckout',
  'googleAnalyticsTrackPurchase',
  'googleAnalyticsTrackSearch',
  'googleAdsEnabled',
  'googleAdsConversionId',
  'facebookPixelEnabled',
  'facebookPixelId',
  'pixelTrackPageView',
  'pixelTrackViewContent',
  'pixelTrackAddToCart',
  'pixelTrackInitiateCheckout',
  'pixelTrackPurchase',
  'pixelTrackSearch',
  'pixelTrackAddToWishlist',
  'facebookConvApiEnabled',
  'capiTrackPageView',
  'capiTrackViewContent',
  'capiTrackAddToCart',
  'capiTrackInitiateCheckout',
  'capiTrackPurchase',
  'capiTrackSearch',
  'eventDeduplicationEnabled',
  'eventMatchQualityTarget',
  'gdprCompliant',
  'hashUserData',
  'clarityProjectId',
  'clarityApiToken',
  'tiktokPixelEnabled',
  'tiktokPixelId',
  'tiktokTrackPageView',
  'tiktokTrackViewContent',
  'tiktokTrackAddToCart',
  'tiktokTrackInitiateCheckout',
  'tiktokTrackPurchase',
  'tiktokTrackSearch',
  'tiktokTrackAddToWishlist',
  'productPageShowCheckoutForm',
  'enabledPaymentMethods',
  'walletPaymentSettings',
  'hideUtilityBar',
  'createdAt',
  'updatedAt',
];
const DEFAULT_PUBLIC_STOREFRONT_SETTINGS = {
  defaultLayout: 'default',
  supportedLanguages: 'ar,en',
  quickViewEnabled: true,
  comparisonEnabled: false,
  wishlistEnabled: true,
  recentlyViewedEnabled: true,
  advancedFiltersEnabled: false,
  productCardStyle: 'default',
  gridAddToCartIcon: 'plus',
  gridDiscountBanner: true,
  gtmEnabled: false,
  gtmContainerId: '',
  gtmDataLayerEnabled: true,
  gtmTrackPageView: true,
  gtmSuppressPixels: false,
  googleAnalyticsEnabled: false,
  googleAnalyticsMeasurementId: '',
  googleAnalyticsTrackPageView: true,
  googleAnalyticsTrackViewContent: true,
  googleAnalyticsTrackAddToCart: true,
  googleAnalyticsTrackInitiateCheckout: true,
  googleAnalyticsTrackPurchase: true,
  googleAnalyticsTrackSearch: true,
  googleAdsEnabled: false,
  googleAdsConversionId: '',
  facebookPixelEnabled: false,
  facebookPixelId: '',
  pixelTrackPageView: true,
  pixelTrackViewContent: true,
  pixelTrackAddToCart: true,
  pixelTrackInitiateCheckout: true,
  pixelTrackPurchase: true,
  pixelTrackSearch: true,
  pixelTrackAddToWishlist: false,
  facebookConvApiEnabled: false,
  capiTrackPageView: true,
  capiTrackViewContent: true,
  capiTrackAddToCart: true,
  capiTrackInitiateCheckout: true,
  capiTrackPurchase: true,
  capiTrackSearch: true,
  eventDeduplicationEnabled: true,
  eventMatchQualityTarget: 70,
  gdprCompliant: true,
  hashUserData: true,
  clarityProjectId: '',
  clarityApiToken: '',
  tiktokPixelEnabled: false,
  tiktokPixelId: '',
  tiktokTrackPageView: true,
  tiktokTrackViewContent: true,
  tiktokTrackAddToCart: true,
  tiktokTrackInitiateCheckout: true,
  tiktokTrackPurchase: true,
  tiktokTrackSearch: true,
  tiktokTrackAddToWishlist: false,
  productPageShowCheckoutForm: true,
};

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (target, source) => {
  const output = { ...(target || {}) };

  Object.entries(source || {}).forEach(([key, value]) => {
    const currentValue = output[key];
    if (isRecord(currentValue) && isRecord(value)) {
      output[key] = deepMerge(currentValue, value);
      return;
    }

    if (value !== undefined) {
      output[key] = value;
    }
  });

  return output;
};

const sanitizeDesignTokens = (value) => {
  if (!isRecord(value)) {
    return {};
  }

  return deepMerge({}, value);
};

const TEMPLATE_VISUAL_TOKEN_KEYS = new Set([
  'colors',
  'typography',
  'shape',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'muted',
  'mutedForeground',
  'border',
  'card',
  'cardForeground',
  'ring',
  'surface',
  'text',
  'textMuted',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'textColor',
  'surfaceColor',
  'borderColor',
  'fontFamily',
  'headingFont',
  'bodyFont',
  'baseSize',
  'fontSizeBase',
  'borderRadius',
  'buttonRadius',
]);

const sanitizeTemplateDesignTokens = (value) => {
  const designTokens = sanitizeDesignTokens(value);

  return Object.entries(designTokens).reduce((acc, [key, tokenValue]) => {
    if (TEMPLATE_VISUAL_TOKEN_KEYS.has(key)) {
      return acc;
    }

    acc[key] = isRecord(tokenValue) ? deepMerge({}, tokenValue) : tokenValue;
    return acc;
  }, {});
};

const getPublicStorefrontSettingsSelect = (prisma) => {
  const modelFields = prisma?._runtimeDataModel?.models?.StorefrontSettings?.fields || [];
  const availableFields = new Set(modelFields.map((field) => field.name));
  const select = {
    id: true,
    companyId: true,
  };

  for (const field of PUBLIC_STOREFRONT_SETTINGS_FIELDS) {
    if (availableFields.has(field)) {
      select[field] = true;
    }
  }

  if (availableFields.has('facebookPixelConfigs')) {
    select.facebookPixelConfigs = {
      where: { isActive: true },
      select: {
        id: true,
        pixelId: true,
        pixelName: true,
        isPrimary: true,
        trackPageView: true,
        trackViewContent: true,
        trackAddToCart: true,
        trackInitiateCheckout: true,
        trackPurchase: true,
        trackSearch: true,
        trackAddToWishlist: true,
      },
    };
  }

  return select;
};

const parseCompanySettings = (value) => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const resolveThemeId = ({
  companyDesignTokens,
  templateSettings,
  safeTemplateContent,
  defaultThemeId = DEFAULT_THEME_ID,
}) =>
  (typeof companyDesignTokens.themeId === 'string' && companyDesignTokens.themeId.trim()) ||
  (typeof templateSettings.themeId === 'string' && templateSettings.themeId.trim()) ||
  (typeof safeTemplateContent.themeId === 'string' && safeTemplateContent.themeId.trim()) ||
  defaultThemeId;

const resolveTemplateThemeId = ({ templateSettings, safeTemplateContent }) =>
  (typeof templateSettings.themeId === 'string' && templateSettings.themeId.trim()) ||
  (typeof safeTemplateContent.themeId === 'string' && safeTemplateContent.themeId.trim()) ||
  '';

const shouldApplyTemplateSettings = ({
  resolvedThemeId,
  templateSettings,
  safeTemplateContent,
}) => {
  const templateThemeId = resolveTemplateThemeId({
    templateSettings,
    safeTemplateContent,
  });

  return !templateThemeId || templateThemeId === resolvedThemeId;
};

const buildPublicStorefrontSettings = ({
  storefrontSettings,
  company,
  defaultThemeId = DEFAULT_THEME_ID,
}) => {
  const companySettings = parseCompanySettings(company.settings);
  const designTokens = sanitizeDesignTokens(storefrontSettings?.designTokens);
  const themeId =
    (typeof designTokens.themeId === 'string' && designTokens.themeId.trim()) ||
    defaultThemeId;

  return {
    ...DEFAULT_PUBLIC_STOREFRONT_SETTINGS,
    ...(storefrontSettings || {}),
    companyId: company.id,
    storeName:
      (typeof designTokens.storeName === 'string' && designTokens.storeName.trim()) ||
      company.name,
    description:
      (typeof companySettings.description === 'string' && companySettings.description.trim()) ||
      (typeof designTokens.description === 'string' && designTokens.description.trim()) ||
      '',
    currency: company.currency || 'EGP',
    themeId,
    designTokens: {
      ...designTokens,
      themeId,
    },
  };
};

const buildPublicMarketplaceApps = (companyApps) =>
  (Array.isArray(companyApps) ? companyApps : []).reduce((acc, companyApp) => {
    const slug = companyApp?.app?.slug;

    if (!slug || !PUBLIC_MARKETPLACE_APP_SLUGS.includes(slug)) {
      return acc;
    }

    const settings = sanitizeMarketplaceAppSettings(slug, companyApp.settings);
    const enabled =
      (companyApp.status === 'TRIAL' || companyApp.status === 'ACTIVE') &&
      (!isRecord(settings.general) || settings.general.enabled !== false);

    acc[slug] = {
      enabled,
      status: companyApp.status,
      settings,
    };

    return acc;
  }, {});

const buildStorefrontConfig = ({
  templateContent,
  storefrontSettings,
  company,
  marketplaceApps,
  defaultThemeId = DEFAULT_THEME_ID,
}) => {
  const safeTemplateContent = isRecord(templateContent) ? templateContent : {};
  const templateSettings = isRecord(safeTemplateContent.settings)
    ? safeTemplateContent.settings
    : {};
  const companyDesignTokens = sanitizeDesignTokens(storefrontSettings?.designTokens);
  const resolvedThemeId = resolveThemeId({
    companyDesignTokens,
    templateSettings,
    safeTemplateContent,
    defaultThemeId,
  });
  const canApplyTemplateSettings = shouldApplyTemplateSettings({
    resolvedThemeId,
    templateSettings,
    safeTemplateContent,
  });
  const templateDesignTokens = canApplyTemplateSettings
    ? sanitizeTemplateDesignTokens(templateSettings.designTokens)
    : {};
  const mergedDesignTokens = deepMerge(templateDesignTokens, companyDesignTokens);
  let rawEnabledMethods = storefrontSettings?.enabledPaymentMethods;
  let parsedEnabledMethods = ['cod'];
  try {
    parsedEnabledMethods = typeof rawEnabledMethods === 'string'
      ? JSON.parse(rawEnabledMethods)
      : (Array.isArray(rawEnabledMethods) ? rawEnabledMethods : ['cod']);
  } catch {
    parsedEnabledMethods = ['cod'];
  }
  if (!Array.isArray(parsedEnabledMethods)) parsedEnabledMethods = ['cod'];

  let runtimeWalletSettings = storefrontSettings?.walletPaymentSettings || null;
  if (typeof runtimeWalletSettings === 'string') {
    try {
      runtimeWalletSettings = JSON.parse(runtimeWalletSettings);
    } catch {
      runtimeWalletSettings = null;
    }
  }
  if (runtimeWalletSettings && typeof runtimeWalletSettings === 'object') {
    const hasWalletNumber = Boolean(
      runtimeWalletSettings.walletNumber &&
      String(runtimeWalletSettings.walletNumber).trim()
    );
    const isWalletActive =
      (parsedEnabledMethods.includes('wallet') || hasWalletNumber) &&
      runtimeWalletSettings.enabled !== false;
    runtimeWalletSettings = {
      ...runtimeWalletSettings,
      enabled: isWalletActive,
    };
    if (isWalletActive && !parsedEnabledMethods.includes('wallet')) {
      parsedEnabledMethods.push('wallet');
    } else if (!isWalletActive && parsedEnabledMethods.includes('wallet')) {
      parsedEnabledMethods = parsedEnabledMethods.filter((m) => m !== 'wallet');
    }
  } else {
    parsedEnabledMethods = parsedEnabledMethods.filter((m) => m !== 'wallet');
  }

  const runtimeSettings = {
    themeId: resolvedThemeId,
    storeName: storefrontSettings?.storeName || company.name,
    currency: company.currency,
    description: storefrontSettings?.description || '',
    logoUrl: company.logo || null,
    walletPaymentSettings: runtimeWalletSettings,
  };

  if (canApplyTemplateSettings) {
    ['header', 'footer', 'seo', 'contentOverrides', 'pageOverrides'].forEach((key) => {
      if (isRecord(templateSettings[key])) {
        runtimeSettings[key] = deepMerge({}, templateSettings[key]);
      }
    });
  }

  return {
    themeId: resolvedThemeId,
    designTokens: mergedDesignTokens,
    settings: runtimeSettings,
    apps: marketplaceApps || {},
    storefrontFeatures: storefrontSettings
      ? {
          quickViewEnabled: storefrontSettings.quickViewEnabled,
          comparisonEnabled: storefrontSettings.comparisonEnabled,
          wishlistEnabled: storefrontSettings.wishlistEnabled,
          recentlyViewedEnabled: storefrontSettings.recentlyViewedEnabled,
          advancedFiltersEnabled: storefrontSettings.advancedFiltersEnabled,
          productCardStyle: storefrontSettings.productCardStyle,
          gridAddToCartIcon: storefrontSettings.gridAddToCartIcon,
          gridDiscountBanner: storefrontSettings.gridDiscountBanner,
          enabledPaymentMethods: parsedEnabledMethods,
        }
      : {},
  };
};

/**
 * 🏪 Public Storefront Controller
 * Provides theme and layout configuration for the storefront.
 */
exports.getStorefrontSettings = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المتجر'
      });
    }

    const cacheKey = `storefront_settings:${companyId}`;
    try {
      const cached = await redisCacheService.get(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=60, s-maxage=180, stale-while-revalidate=300');
        return res.json(cached);
      }
    } catch (err) {
      console.error('⚠️ [REDIS] error fetching storefront settings:', err);
    }

    const prisma = await getSharedPrismaClientAsync();

    // Fetch active homepage template and general company info
    const [template, company, storefrontSettings, companyApps, defaultThemeId, storePromotion] = await Promise.all([
      safeQuery(() => prisma.homepageTemplate.findFirst({
        where: {
          companyId: companyId,
          isActive: true,
          pageType: 'HOMEPAGE'
        },
        select: {
          id: true,
          name: true,
          publishedContent: true,
          content: true,
          updatedAt: true
        }
      })),
      safeQuery(() => prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          customDomain: true,
          logo: true,
          currency: true,
          settings: true,
          updatedAt: true,
        }
      })),
      safeQuery(() => prisma.storefrontSettings.findUnique({
        where: { companyId: companyId },
        select: getPublicStorefrontSettingsSelect(prisma),
      })),
      safeQuery(() => prisma.companyApp.findMany({
        where: {
          companyId,
          status: { in: ['TRIAL', 'ACTIVE'] },
          app: {
            slug: {
              in: PUBLIC_MARKETPLACE_APP_SLUGS,
            },
          },
        },
        select: {
          id: true,
          status: true,
          settings: true,
          app: {
            select: {
              slug: true,
            },
          },
        },
      })),
      storefrontThemeCatalogService.getDefaultThemeId({
        fallbackThemeId: DEFAULT_THEME_ID,
      }),
      safeQuery(() => prisma.storePromotion.findFirst({
        where: {
          companyId,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
            { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
          ],
        },
      })),
    ]);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود'
      });
    }

    // Prepare theme data from template
    // Use publishedContent if available, fallback to draft content
    const publicStorefrontSettings = buildPublicStorefrontSettings({
      storefrontSettings,
      company,
      defaultThemeId,
    });
    const publicMarketplaceApps = buildPublicMarketplaceApps(companyApps);
    const storefrontConfig = buildStorefrontConfig({
      templateContent: template?.publishedContent || template?.content || {},
      storefrontSettings: publicStorefrontSettings,
      company,
      marketplaceApps: publicMarketplaceApps,
      defaultThemeId,
    });
    const parsedCompanySettings = parseCompanySettings(company.settings);

    const responseData = {
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          customDomain: company.customDomain || null,
          logo: company.logo,
          currency: company.currency,
          settings: parsedCompanySettings,
          storePromotion: storePromotion || null,
        },
        storefront: storefrontConfig,
        storefrontSettings: publicStorefrontSettings,
        templateId: template?.id || null,
        lastUpdated: template?.updatedAt || company.updatedAt
      }
    };

    try {
      await redisCacheService.set(cacheKey, responseData, 300); // Cache for 5 minutes
    } catch (err) {
      console.error('⚠️ [REDIS] error setting storefront settings cache:', err);
    }

    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.json(responseData);
  } catch (error) {
    console.error('❌ [PUBLIC-STOREFRONT] Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات المتجر',
      error: error.message
    });
  }
};

exports.trackMarketplaceAppUsage = async (req, res) => {
  try {
    const companyId = req.companyId || req.company?.id;
    const { slug } = req.params;
    const { feature, quantity, totalCost, metadata } = req.body || {};

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المتجر',
      });
    }

    if (typeof feature !== 'string' || !feature.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feature is required for tracking',
      });
    }

    const trackingResult = await trackStorefrontAppUsage({
      companyId,
      slug,
      feature,
      quantity,
      totalCost,
      metadata,
    });

    return res.json({
      success: true,
      tracked: Boolean(trackingResult.tracked),
      reason: trackingResult.reason || null,
    });
  } catch (error) {
    console.error('❌ [PUBLIC-STOREFRONT] Error tracking app usage:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تسجيل استخدام التطبيق',
      error: error.message,
    });
  }
};

exports.detectCustomerGeo = async (req, res) => {
  let country = (req.headers['cf-ipcountry'] || '').toUpperCase();
  let region = req.headers['cf-region'] || null;
  let regionCode = req.headers['cf-region-code'] || null;
  let city = req.headers['cf-ipcity'] || null;
  const clientIp = getClientIp(req);
  const cleanIp = (clientIp || '').replace(/^::ffff:/, '').trim();

  // If Cloudflare didn't supply region/regionCode and we have a valid public IP, resolve via ipGeoLookup with multi-provider fallback
  if ((!region || !regionCode) && cleanIp && !isLocalOrPrivateIp(cleanIp)) {
    try {
      const cacheKey = `geo:${cleanIp}`;
      const cached = await redisCacheService.get(cacheKey);
      if (cached && typeof cached === 'object') {
        if (!country && cached.country_code) country = cached.country_code;
        if (cached.region) region = cached.region;
        if (cached.region_code) regionCode = cached.region_code;
        if (cached.city) city = cached.city;
      } else {
        const geo = await resolveIpLocation(cleanIp, req);
        if (geo && (geo.governorate || geo.city)) {
          if (!country && geo.country) country = geo.country;
          if (geo.governorate) region = geo.governorate;
          if (geo.city) city = geo.city;

          await redisCacheService.set(
            cacheKey,
            {
              country_code: country || 'EG',
              region: region || null,
              region_code: regionCode || null,
              city: city || null,
            },
            604800, // 7 days TTL
          );
        }
      }
    } catch {
      // Ignore cache/lookup failure, return available headers
    }
  }

  return res.json({
    success: true,
    country: country || 'EG',
    region,
    regionCode,
    city,
    ip: cleanIp,
  });
};

