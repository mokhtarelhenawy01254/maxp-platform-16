const axios = require('axios');
const crypto = require('crypto');
const {
  getSharedPrismaClientAsync,
  safeQuery,
} = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const {
  DEFAULT_STOREFRONT_THEME_ID,
  storefrontThemeCatalogService,
} = require('../services/storefrontThemeCatalogService');
const FacebookConversionsService = require('../services/facebookConversionsService');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const redisCacheService = require('../services/redisCacheService');
const { isPlaceholderPhone } = require('../utils/placeholderContact');

const DEFAULT_THEME_ID = DEFAULT_STOREFRONT_THEME_ID || 'modern-minimal';
const DEFAULT_SUPPORTED_LANGUAGES = 'ar,en';
const FACEBOOK_GRAPH_VERSION = getMetaGraphApiVersion();
const PIXEL_ID_PATTERN = /^\d{14,18}$/;
const REQUIRED_FACEBOOK_PIXEL_PERMISSIONS = [
  'business_management',
  'ads_read',
  'ads_management',
];

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

const resolveCompanyId = (req) =>
  req.user?.effectiveCompanyId ||
  req.user?.companyId ||
  null;

const runStorefrontSettingsQuery = async (operation) =>
  tenantContext.run(null, () => safeQuery((prisma) => operation(prisma)));

const getAllowedStorefrontSettingsFields = async () => {
  const prisma = await getSharedPrismaClientAsync();
  const fields = prisma?._runtimeDataModel?.models?.StorefrontSettings?.fields || [];
  return new Set(fields.map((field) => field.name));
};

const sanitizeDesignTokens = (value, defaultThemeId = DEFAULT_THEME_ID) => {
  if (!isRecord(value)) {
    return { themeId: defaultThemeId };
  }

  const next = deepMerge({}, value);
  if (typeof next.themeId !== 'string' || !next.themeId.trim()) {
    next.themeId = defaultThemeId;
  }

  return next;
};

const trimToNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const maskToken = (value) => {
  const token = trimToNull(value);
  if (!token) {
    return null;
  }

  if (token.length <= 10) {
    return '********';
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

const getFacebookGraphUrl = (path) =>
  `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${path}`;

const getFacebookErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

const getFacebookErrorCode = (error) =>
  Number(error?.response?.data?.error?.code || error?.response?.data?.code || 0);

const isFacebookTokenError = (error) => {
  const message = getFacebookErrorMessage(error, '');
  const code = getFacebookErrorCode(error);
  return code === 190 || code === 102 || /access token/i.test(message);
};

const isFacebookPermissionError = (error) => {
  const message = getFacebookErrorMessage(error, '');
  const code = getFacebookErrorCode(error);
  return code === 100 || /permission/i.test(message) || /permissions?/i.test(message);
};

const createIssue = (type, code, message) => ({ type, code, message });
const createRecommendation = (priority, message) => ({ priority, message });

const serializePixelConfig = (config) => {
  if (!config) {
    return null;
  }

  const { accessToken, ...rest } = config;
  return {
    ...rest,
    hasAccessToken: Boolean(trimToNull(accessToken)),
    accessTokenPreview: maskToken(accessToken),
  };
};

const sanitizeStorefrontSettingsInput = async (payload = {}) => {
  const allowedFields = await getAllowedStorefrontSettingsFields();
  const sanitized = {};

  for (const [key, value] of Object.entries(payload || {})) {
    if (
      (key === 'whatsappNumber' || key === 'phone' || key === 'contactPhone') &&
      isPlaceholderPhone(value)
    ) {
      return {
        ok: false,
        message: 'رقم الهاتف غير صالح — يرجى إدخال رقم حقيقي',
      };
    }

    if (!allowedFields.has(key)) {
      continue;
    }

    if (key === 'id' || key === 'companyId' || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }

    if (key === 'designTokens') {
      sanitized.designTokens = sanitizeDesignTokens(value);
      continue;
    }

    sanitized[key] = value;
  }

  return { ok: true, sanitized };
};

const resolveDefaultStorefrontThemeId = async () =>
  storefrontThemeCatalogService.getDefaultThemeId({
    fallbackThemeId: DEFAULT_THEME_ID,
  });

const buildCreateDefaults = async (company) => {
  const defaultThemeId = await resolveDefaultStorefrontThemeId();

  return {
    companyId: company.id,
    supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES,
    designTokens: {
      themeId: defaultThemeId,
      storeName: company.name,
      currency: company.currency || 'EGP',
    },
    enabledPaymentMethods: '["cod"]',
  };
};

const isMaskedToken = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  // Match exact patterns produced by maskToken():
  // - '********' for tokens <= 10 chars
  // - 'XXXX...XXXX' (4 leading chars + '...' + 4 trailing chars = 11 chars total)
  return trimmed === '********' || /^.{4}\.\.\..{4}$/.test(trimmed);
};

const mergeGatewayConfig = (incoming, existing) => {
  if (!incoming) {
    return null;
  }

  let parsedIncoming = incoming;
  if (typeof incoming === 'string') {
    try {
      parsedIncoming = JSON.parse(incoming);
    } catch (e) {
      console.error('Failed to parse incoming paymentGatewayConfig:', e);
      return null;
    }
  }

  if (!parsedIncoming || typeof parsedIncoming !== 'object') {
    return null;
  }

  let parsedExisting = existing;
  if (typeof existing === 'string') {
    try {
      parsedExisting = JSON.parse(existing);
    } catch (e) {
      parsedExisting = null;
    }
  }

  const merged = { ...parsedIncoming };

  if (parsedExisting && typeof parsedExisting === 'object') {
    if (merged.apiKey && isMaskedToken(merged.apiKey)) {
      merged.apiKey = parsedExisting.apiKey || '';
    }
    if (merged.secretKey && isMaskedToken(merged.secretKey)) {
      merged.secretKey = parsedExisting.secretKey || '';
    }
  }

  return merged;
};

const maskGatewayConfig = (config) => {
  if (!config) {
    return null;
  }

  let parsed = config;
  if (typeof config === 'string') {
    try {
      parsed = JSON.parse(config);
    } catch (e) {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const masked = { ...parsed };

  if (masked.apiKey) {
    masked.apiKey = maskToken(masked.apiKey);
  }

  if (masked.secretKey) {
    masked.secretKey = maskToken(masked.secretKey);
  }

  return masked;
};

const serializeStorefrontSettings = (settings, company) => {
  const designTokens = sanitizeDesignTokens(settings?.designTokens);
  return {
    ...settings,
    companyId: company.id,
    companySlug: company.slug || null,
    customDomain: company.customDomain || null,
    storeName: company.name,
    description: company.settings?.description || '',
    currency: company.currency || 'EGP',
    themeId:
      (typeof designTokens.themeId === 'string' && designTokens.themeId.trim()) ||
      DEFAULT_THEME_ID,
    designTokens,
    paymentGatewayConfig: maskGatewayConfig(settings?.paymentGatewayConfig),
    enabledPaymentMethods: settings?.enabledPaymentMethods || '["cod"]',
    walletPaymentSettings: settings?.walletPaymentSettings || null,
  };
};

const buildPixelEventsList = (settings) =>
  [
    ['pixelTrackPageView', 'PageView'],
    ['pixelTrackViewContent', 'ViewContent'],
    ['pixelTrackAddToCart', 'AddToCart'],
    ['pixelTrackInitiateCheckout', 'InitiateCheckout'],
    ['pixelTrackPurchase', 'Purchase'],
    ['pixelTrackSearch', 'Search'],
    ['pixelTrackAddToWishlist', 'AddToWishlist'],
  ]
    .filter(([field]) => Boolean(settings?.[field]))
    .map(([, eventName]) => eventName);

const buildCapiEventsList = (settings) =>
  [
    ['capiTrackPageView', 'PageView'],
    ['capiTrackViewContent', 'ViewContent'],
    ['capiTrackAddToCart', 'AddToCart'],
    ['capiTrackInitiateCheckout', 'InitiateCheckout'],
    ['capiTrackPurchase', 'Purchase'],
    ['capiTrackSearch', 'Search'],
  ]
    .filter(([field]) => Boolean(settings?.[field]))
    .map(([, eventName]) => eventName);

const buildDiagnosticsData = (settings, pixelConfigs = [], company = null) => {
  const pixelConfigured =
    Boolean(settings?.facebookPixelEnabled) && Boolean(trimToNull(settings?.facebookPixelId));
  const effectiveCapiToken =
    trimToNull(settings?.facebookConvApiToken) ||
    trimToNull(company?.facebookPixelAccessToken) ||
    trimToNull(company?.facebookAdsAccessToken) ||
    trimToNull(company?.facebookUserAccessToken);
  const capiConfigured =
    Boolean(settings?.facebookConvApiEnabled) &&
    Boolean(effectiveCapiToken);

  const pixelIssues = [];
  const capiIssues = [];
  const recommendations = [];

  if (!pixelConfigured) {
    pixelIssues.push(
      createIssue(
        'configuration',
        'pixel_missing',
        'لم يتم تفعيل Facebook Pixel أو لم يتم إدخال Pixel ID بعد.'
      )
    );
    recommendations.push(
      createRecommendation('high', 'فعّل Facebook Pixel وحدد Pixel ID صالح لتفعيل التتبع الأساسي.')
    );
  }

  if (!capiConfigured) {
    capiIssues.push(
      createIssue(
        'configuration',
        'capi_missing',
        'Conversions API غير مفعّل أو لا يحتوي على Access Token صالح.'
      )
    );
    recommendations.push(
      createRecommendation(
        'medium',
        'فعّل Conversions API وأضف Access Token لتحسين دقة التتبع ومقاومة Ad Blockers.'
      )
    );
  }

  if (!settings?.eventDeduplicationEnabled) {
    recommendations.push(
      createRecommendation('medium', 'فعّل Event Deduplication لتجنب احتساب الأحداث مرتين.')
    );
  }

  if (!settings?.hashUserData) {
    recommendations.push(
      createRecommendation('low', 'فعّل Hash User Data لتحسين الامتثال وجودة المطابقة.')
    );
  }

  const scoreBase =
    (pixelConfigured ? 40 : 0) +
    (capiConfigured ? 35 : 0) +
    (settings?.eventDeduplicationEnabled ? 15 : 0) +
    (settings?.hashUserData ? 10 : 0);
  const issuePenalty = (pixelIssues.length + capiIssues.length) * 5;
  const score = Math.max(0, Math.min(100, scoreBase - issuePenalty));

  return {
    timestamp: new Date().toISOString(),
    overall: {
      status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'error',
      score,
      issues: [...pixelIssues, ...capiIssues],
      recommendations,
    },
    pixel: {
      configured: pixelConfigured,
      status: settings?.pixelStatus || (pixelConfigured ? 'configured' : 'not_configured'),
      pixelId: trimToNull(settings?.facebookPixelId),
      lastTest: settings?.lastPixelTest || null,
      issues: pixelIssues,
    },
    capi: {
      configured: capiConfigured,
      status: settings?.capiStatus || (capiConfigured ? 'configured' : 'not_configured'),
      hasToken: Boolean(effectiveCapiToken),
      tokenStatus: effectiveCapiToken ? 'available' : 'missing',
      lastTest: settings?.lastCapiTest || null,
      issues: capiIssues,
    },
    events: {
      pixelEvents: buildPixelEventsList(settings),
      capiEvents: buildCapiEventsList(settings),
      deduplicationEnabled: Boolean(settings?.eventDeduplicationEnabled),
    },
    multiplePixels: {
      enabled: pixelConfigs.length > 0,
      count: pixelConfigs.length,
      pixels: pixelConfigs.map(serializePixelConfig),
    },
  };
};

const sanitizePixelConfigPayload = (payload = {}, { partial = false } = {}) => {
  const sanitized = {};

  const stringFields = ['pixelId', 'pixelName', 'accessToken'];
  stringFields.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }

    const normalized = trimToNull(payload[field]);
    if (normalized || !partial) {
      sanitized[field] = normalized || '';
    }
  });

  const booleanFields = [
    'isActive',
    'isPrimary',
    'trackPageView',
    'trackViewContent',
    'trackAddToCart',
    'trackInitiateCheckout',
    'trackPurchase',
    'trackSearch',
    'trackAddToWishlist',
    'trackLead',
    'trackCompleteRegistration',
  ];

  booleanFields.forEach((field) => {
    if (typeof payload[field] === 'boolean') {
      sanitized[field] = payload[field];
    }
  });

  return sanitized;
};

const getStorefrontContext = async (companyId, { includePixels = false } = {}) => {
  const company = await getCompanyContext(companyId);
  if (!company) {
    return null;
  }

  const createDefaults = await buildCreateDefaults(company);
  const settings = await runStorefrontSettingsQuery((prisma) =>
    prisma.storefrontSettings.upsert({
      where: { companyId },
      update: {},
      create: createDefaults,
      ...(includePixels
        ? {
            include: {
              facebookPixelConfigs: {
                orderBy: [{ isPrimary: 'desc' }, { isActive: 'desc' }, { createdAt: 'asc' }],
              },
            },
          }
        : {}),
    })
  );

  return { company, settings };
};

const updateStorefrontSettingsStatus = async (companyId, data) =>
  runStorefrontSettingsQuery((prisma) =>
    prisma.storefrontSettings.update({
      where: { companyId },
      data,
    })
  );

const getPrimaryManagementToken = ({ company, settings, pixelConfig = null }) =>
  trimToNull(pixelConfig?.accessToken) ||
  trimToNull(company?.facebookPixelAccessToken) ||
  trimToNull(company?.facebookAdsAccessToken) ||
  trimToNull(company?.facebookUserAccessToken) ||
  trimToNull(settings?.facebookConvApiToken);

const getPrimaryConversionsToken = ({ company, settings, pixelConfig = null }) =>
  trimToNull(settings?.facebookConvApiToken) ||
  trimToNull(pixelConfig?.accessToken) ||
  trimToNull(company?.facebookPixelAccessToken) ||
  trimToNull(company?.facebookAdsAccessToken) ||
  trimToNull(company?.facebookUserAccessToken);

const verifyPixelWithFacebook = async (pixelId, accessToken) => {
  const response = await axios.get(getFacebookGraphUrl(pixelId), {
    params: {
      access_token: accessToken,
      fields: 'id,name',
    },
  });

  return response.data;
};

const syncPrimaryPixelToSettings = async (prisma, companyId, pixelConfig) => {
  if (!pixelConfig) {
    await prisma.storefrontSettings.update({
      where: { companyId },
      data: {
        facebookPixelId: null,
        facebookPixelEnabled: false,
        pixelStatus: 'not_configured',
      },
    });
    return;
  }

  await prisma.storefrontSettings.update({
    where: { companyId },
    data: {
      facebookPixelId: pixelConfig.pixelId,
      facebookPixelEnabled: true,
      pixelStatus: 'configured',
      ...(trimToNull(pixelConfig.accessToken)
        ? { facebookConvApiToken: trimToNull(pixelConfig.accessToken) }
        : {}),
    },
  });
};

const getCompanyContext = async (companyId) => {
  const company = await runStorefrontSettingsQuery((prisma) =>
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        currency: true,
        settings: true,
        facebookPixelAccessToken: true,
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    })
  );

  if (!company) {
    return null;
  }

  let parsedSettings = {};
  try {
    parsedSettings = company.settings ? JSON.parse(company.settings) : {};
  } catch {
    parsedSettings = {};
  }

  return {
    ...company,
    settings: parsedSettings,
  };
};

const getSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const company = await getCompanyContext(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const createDefaults = await buildCreateDefaults(company);
    const settings = await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.upsert({
        where: { companyId },
        update: {},
        create: createDefaults,
      })
    );

    return res.json({
      success: true,
      data: serializeStorefrontSettings(settings, company),
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to get settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load storefront settings',
      error: error.message,
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const company = await getCompanyContext(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const existingSettings = await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: {
          designTokens: true,
          paymentGatewayConfig: true,
          enabledPaymentMethods: true,
          walletPaymentSettings: true,
        },
      })
    );

    const createDefaults = await buildCreateDefaults(company);
    const currentDesignTokens = isRecord(existingSettings?.designTokens)
      ? existingSettings.designTokens
      : {};
    const defaultDesignTokens = isRecord(createDefaults.designTokens)
      ? createDefaults.designTokens
      : {};
    const currentThemeId =
      typeof currentDesignTokens.themeId === 'string' && currentDesignTokens.themeId.trim()
        ? currentDesignTokens.themeId.trim()
        : typeof defaultDesignTokens.themeId === 'string' && defaultDesignTokens.themeId.trim()
          ? defaultDesignTokens.themeId.trim()
          : DEFAULT_THEME_ID;

    const sanitizeResult = await sanitizeStorefrontSettingsInput(req.body || {});

    if (!sanitizeResult.ok) {
      return res.status(400).json({
        success: false,
        message: sanitizeResult.message,
      });
    }

    const sanitizedInput = sanitizeResult.sanitized;

    if (sanitizedInput.paymentGatewayConfig !== undefined) {
      sanitizedInput.paymentGatewayConfig = mergeGatewayConfig(
        sanitizedInput.paymentGatewayConfig,
        existingSettings?.paymentGatewayConfig
      );
    }
    const nextDesignTokens = sanitizeDesignTokens({
      ...currentDesignTokens,
      ...(isRecord(req.body?.designTokens) ? req.body.designTokens : {}),
      ...(typeof req.body?.themeId === 'string' ? { themeId: req.body.themeId } : {}),
    }, currentThemeId);

    const themeGuard = await storefrontThemeCatalogService.ensureThemeSelection(
      nextDesignTokens.themeId,
      {
        currentThemeId,
        companyId,
      },
    );

    if (!themeGuard.ok) {
      return res.status(400).json({
        success: false,
        message:
          themeGuard.reason === 'activation_required'
            ? 'القالب المحدد يحتاج تفعيلًا أولًا من مكتبة القوالب'
            : themeGuard.reason === 'inactive'
            ? 'القالب المحدد غير متاح للتفعيل حاليًا'
            : 'القالب المحدد غير موجود',
      });
    }

    if (Object.keys(nextDesignTokens).length > 0) {
      sanitizedInput.designTokens = nextDesignTokens;
    }

    // Synchronize enabledPaymentMethods and walletPaymentSettings.enabled
    if (sanitizedInput.walletPaymentSettings && typeof sanitizedInput.walletPaymentSettings === 'object') {
      const walletEnabled = sanitizedInput.walletPaymentSettings.enabled;
      if (typeof walletEnabled === 'boolean') {
        const existingMethodsRaw = sanitizedInput.enabledPaymentMethods !== undefined
          ? sanitizedInput.enabledPaymentMethods
          : existingSettings?.enabledPaymentMethods;
        let methods = [];
        try {
          methods = typeof existingMethodsRaw === 'string'
            ? JSON.parse(existingMethodsRaw)
            : (Array.isArray(existingMethodsRaw) ? existingMethodsRaw : ['cod']);
        } catch {
          methods = ['cod'];
        }
        if (!Array.isArray(methods)) methods = ['cod'];

        if (walletEnabled && !methods.includes('wallet')) {
          methods.push('wallet');
          sanitizedInput.enabledPaymentMethods = JSON.stringify(methods);
        } else if (!walletEnabled && methods.includes('wallet')) {
          sanitizedInput.enabledPaymentMethods = JSON.stringify(methods.filter((m) => m !== 'wallet'));
        }
      }
    } else if (sanitizedInput.enabledPaymentMethods !== undefined) {
      let methods = [];
      try {
        methods = typeof sanitizedInput.enabledPaymentMethods === 'string'
          ? JSON.parse(sanitizedInput.enabledPaymentMethods)
          : (Array.isArray(sanitizedInput.enabledPaymentMethods) ? sanitizedInput.enabledPaymentMethods : ['cod']);
      } catch {
        methods = ['cod'];
      }
      if (Array.isArray(methods)) {
        const existingWallet = existingSettings?.walletPaymentSettings;
        if (existingWallet && typeof existingWallet === 'object') {
          const shouldBeEnabled = methods.includes('wallet');
          if (existingWallet.enabled !== shouldBeEnabled) {
            sanitizedInput.walletPaymentSettings = {
              ...existingWallet,
              enabled: shouldBeEnabled,
            };
          }
        }
      }
    }

    const settings = await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.upsert({
        where: { companyId },
        update: sanitizedInput,
        create: {
          ...createDefaults,
          ...sanitizedInput,
        },
      })
    );

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (err) {
      console.error('⚠️ [REDIS] failed to invalidate settings cache:', err);
    }

    return res.json({
      success: true,
      message: 'Storefront settings updated successfully',
      data: serializeStorefrontSettings(settings, company),
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to update settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update storefront settings',
      error: error.message,
    });
  }
};

const resetSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const company = await getCompanyContext(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.deleteMany({
        where: { companyId },
      })
    );

    const createDefaults = await buildCreateDefaults(company);
    const settings = await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.create({
        data: createDefaults,
      })
    );

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (err) {
      console.error('⚠️ [REDIS] failed to invalidate settings cache:', err);
    }

    return res.json({
      success: true,
      message: 'Storefront settings reset successfully',
      data: serializeStorefrontSettings(settings, company),
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to reset settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset storefront settings',
      error: error.message,
    });
  }
};

const testFacebookPixel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: false,
        message: 'Company context is required',
      });
    }

    const context = await getStorefrontContext(companyId);
    if (!context) {
      return res.json({
        success: false,
        message: 'Company not found',
      });
    }

    const { company, settings } = context;
    const pixelId = trimToNull(settings.facebookPixelId);

    if (!pixelId) {
      return res.json({
        success: false,
        message: 'يرجى إدخال Pixel ID أولاً',
      });
    }

    if (!PIXEL_ID_PATTERN.test(pixelId)) {
      await updateStorefrontSettingsStatus(companyId, {
        pixelStatus: 'invalid',
        lastPixelTest: new Date(),
      });

      return res.json({
        success: false,
        message: 'Pixel ID يجب أن يتكون من 14 إلى 18 رقماً',
      });
    }

    const accessToken = getPrimaryManagementToken({ company, settings });

    if (!accessToken) {
      await updateStorefrontSettingsStatus(companyId, {
        pixelStatus: 'configured',
        lastPixelTest: new Date(),
      });

      return res.json({
        success: false,
        message:
          'تم حفظ Pixel ID بصيغة صحيحة، لكن لا يوجد Facebook Access Token للتحقق الكامل. استخدم الربط السهل أولاً.',
      });
    }

    try {
      const pixelData = await verifyPixelWithFacebook(pixelId, accessToken);

      await updateStorefrontSettingsStatus(companyId, {
        pixelStatus: 'active',
        lastPixelTest: new Date(),
      });

      return res.json({
        success: true,
        message: `✅ تم التحقق من Pixel بنجاح: ${pixelData.name || pixelData.id}`,
        data: {
          pixelId: pixelData.id,
          pixelName: pixelData.name || null,
          verified: true,
        },
      });
    } catch (error) {
      const status =
        isFacebookTokenError(error) || isFacebookPermissionError(error) ? 'configured' : 'error';

      await updateStorefrontSettingsStatus(companyId, {
        pixelStatus: status,
        lastPixelTest: new Date(),
      });

      return res.json({
        success: false,
        needsAuth: isFacebookTokenError(error) || isFacebookPermissionError(error),
        message: getFacebookErrorMessage(
          error,
          'فشل التحقق من Pixel عبر Facebook. يرجى إعادة الربط أو مراجعة الصلاحيات.'
        ),
      });
    }
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to test pixel:', error);
    return res.json({
      success: false,
      message: 'فشل اختبار Facebook Pixel',
      error: error.message,
    });
  }
};

const testFacebookCapi = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: false,
        message: 'Company context is required',
      });
    }

    const context = await getStorefrontContext(companyId);
    if (!context) {
      return res.json({
        success: false,
        message: 'Company not found',
      });
    }

    const { company, settings } = context;
    const pixelId =
      trimToNull(req.body?.pixelId) ||
      trimToNull(settings.facebookPixelId);

    if (!pixelId) {
      return res.json({
        success: false,
        message: 'يرجى إدخال Pixel ID أولاً قبل اختبار Conversions API',
      });
    }

    const rawBodyToken = trimToNull(req.body?.accessToken);
    const accessToken =
      rawBodyToken && !isMaskedToken(rawBodyToken)
        ? rawBodyToken
        : getPrimaryConversionsToken({ company, settings });

    if (!accessToken) {
      return res.json({
        success: false,
        message: 'يرجى ربط حساب فيسبوك أو إضافة Access Token أولاً',
      });
    }

    const testEventCode =
      trimToNull(req.body?.testEventCode) ||
      trimToNull(settings.facebookConvApiTestCode);

    const service = new FacebookConversionsService(
      pixelId,
      accessToken,
      testEventCode
    );

    const result = await service.testConnection();

    await updateStorefrontSettingsStatus(companyId, {
      capiStatus: result.success ? 'active' : 'error',
      lastCapiTest: new Date(),
    });

    return res.json({
      success: Boolean(result.success),
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to test CAPI:', error);
    return res.json({
      success: false,
      message: getFacebookErrorMessage(error, 'فشل اختبار Facebook Conversions API'),
    });
  }
};

const sendTestEvent = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context is required' });
    }

    const context = await getStorefrontContext(companyId);
    if (!context) {
      return res.status(404).json({ success: false, message: 'Storefront context not found' });
    }

    const { company, settings } = context;
    const pixelId = trimToNull(settings.facebookPixelId);
    if (!pixelId) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال Pixel ID أولاً' });
    }

    const accessToken = getPrimaryConversionsToken({ company, settings });
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'يرجى إضافة Access Token أولاً' });
    }

    const {
      eventName = 'Purchase',
      value = 150,
      currency = 'EGP',
      contentName = 'منتج تجريبي للتأكد من الربط',
    } = req.body || {};

    const testEventCode = trimToNull(settings.facebookConvApiTestCode);
    const service = new FacebookConversionsService(pixelId, accessToken, testEventCode);

    const eventId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userData = {
      email: 'test@example.com',
      phone: '+201000000000',
      firstName: 'MaxP',
      lastName: 'Tester',
      city: 'Cairo',
      country: 'eg',
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      pageUrl: req.headers.referer || 'https://maxp.online',
    };

    let result;
    if (eventName === 'Purchase') {
      result = await service.trackPurchase(
        userData,
        {
          id: eventId,
          total: Number(value),
          currency,
          items: [{ productId: 'TEST-SKU-1', name: contentName, price: Number(value), quantity: 1 }],
        },
        eventId
      );
    } else if (eventName === 'AddToCart') {
      result = await service.trackAddToCart(
        userData,
        {
          id: 'TEST-PROD-1',
          name: contentName,
          price: Number(value),
          category: 'Test Category',
        },
        eventId
      );
    } else if (eventName === 'ViewContent') {
      result = await service.trackViewContent(
        userData,
        {
          id: 'TEST-PROD-1',
          name: contentName,
          price: Number(value),
          category: 'Test Category',
        },
        eventId
      );
    } else {
      result = await service.trackPageView(
        userData,
        userData.pageUrl,
        eventId
      );
    }

    return res.json({
      success: true,
      message: `تم إرسال حدث ${eventName} بنجاح إلى Facebook Conversions API!`,
      data: {
        eventId,
        eventName,
        value,
        currency,
        pixelId,
        testEventCode,
        metaResult: result,
      },
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to send test event:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل إرسال الحدث التجريبي',
    });
  }
};

const getPixelDiagnostics = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: true,
        data: buildDiagnosticsData(null, []),
      });
    }

    const context = await getStorefrontContext(companyId, { includePixels: true });
    if (!context) {
      return res.json({
        success: true,
        data: buildDiagnosticsData(null, []),
      });
    }

    return res.json({
      success: true,
      data: buildDiagnosticsData(
        context.settings,
        context.settings.facebookPixelConfigs || [],
        context.company
      ),
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to load diagnostics:', error);
    return res.json({
      success: false,
      message: 'فشل تحميل تشخيص Facebook Pixel',
      error: error.message,
    });
  }
};

const checkTokenPermissions = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: true,
        data: {
          valid: false,
          hasToken: false,
          permissions: [],
          missingPermissions: REQUIRED_FACEBOOK_PIXEL_PERMISSIONS,
          tokenSource: null,
        },
      });
    }

    const context = await getStorefrontContext(companyId);
    if (!context) {
      return res.json({
        success: true,
        data: {
          valid: false,
          hasToken: false,
          permissions: [],
          missingPermissions: REQUIRED_FACEBOOK_PIXEL_PERMISSIONS,
          tokenSource: null,
        },
      });
    }

    const { company, settings } = context;
    const capiToken = trimToNull(settings.facebookConvApiToken);
    const pixelToken = trimToNull(company.facebookPixelAccessToken);
    const adsToken = trimToNull(company.facebookAdsAccessToken);
    const userToken = trimToNull(company.facebookUserAccessToken);
    const accessToken = capiToken || pixelToken || adsToken || userToken;
    const tokenSource = capiToken
      ? 'capi_token'
      : pixelToken
      ? 'pixel_oauth'
      : adsToken
      ? 'ads_oauth'
      : userToken
      ? 'user_oauth'
      : null;

    if (!accessToken) {
      return res.json({
        success: true,
        data: {
          valid: false,
          hasToken: false,
          permissions: [],
          missingPermissions: REQUIRED_FACEBOOK_PIXEL_PERMISSIONS,
          tokenSource: null,
        },
        message: 'لا يوجد Facebook Access Token محفوظ حاليًا',
      });
    }

    try {
      const [meResponse, permissionsResponse] = await Promise.all([
        axios.get(getFacebookGraphUrl('me'), {
          params: {
            access_token: accessToken,
            fields: 'id,name',
          },
        }),
        axios.get(getFacebookGraphUrl('me/permissions'), {
          params: {
            access_token: accessToken,
          },
        }),
      ]);

      const grantedPermissions = (permissionsResponse.data?.data || [])
        .filter((permission) => permission.status === 'granted')
        .map((permission) => permission.permission);

      const missingPermissions = REQUIRED_FACEBOOK_PIXEL_PERMISSIONS.filter(
        (permission) => !grantedPermissions.includes(permission)
      );

      return res.json({
        success: true,
        data: {
          valid: missingPermissions.length === 0,
          hasToken: true,
          permissions: grantedPermissions,
          missingPermissions,
          tokenSource,
          user: meResponse.data,
        },
      });
    } catch (error) {
      return res.json({
        success: true,
        data: {
          valid: false,
          hasToken: true,
          permissions: [],
          missingPermissions: REQUIRED_FACEBOOK_PIXEL_PERMISSIONS,
          tokenSource,
          errorCode: getFacebookErrorCode(error) || null,
          errorMessage: getFacebookErrorMessage(error, 'فشل التحقق من صلاحيات الـ Token'),
        },
        message: getFacebookErrorMessage(error, 'فشل التحقق من صلاحيات الـ Token'),
      });
    }
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to check token permissions:', error);
    return res.json({
      success: true,
      data: {
        valid: false,
        hasToken: false,
        permissions: [],
        missingPermissions: REQUIRED_FACEBOOK_PIXEL_PERMISSIONS,
        tokenSource: null,
        errorMessage: error.message,
      },
    });
  }
};

const getPixels = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: true,
        data: {
          pixels: [],
        },
      });
    }

    const context = await getStorefrontContext(companyId, { includePixels: true });
    if (!context) {
      return res.json({
        success: true,
        data: {
          pixels: [],
        },
      });
    }

    return res.json({
      success: true,
      data: {
        pixels: (context.settings.facebookPixelConfigs || []).map(serializePixelConfig),
      },
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to load pixels:', error);
    return res.json({
      success: false,
      message: 'فشل تحميل البكسلات',
      error: error.message,
    });
  }
};

const addPixel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const context = await getStorefrontContext(companyId, { includePixels: true });
    if (!context) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const payload = sanitizePixelConfigPayload(req.body || {});
    const pixelId = trimToNull(payload.pixelId);
    const pixelName = trimToNull(payload.pixelName);

    if (!pixelId || !pixelName) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID واسم Pixel مطلوبان',
      });
    }

    if (!PIXEL_ID_PATTERN.test(pixelId)) {
      return res.status(400).json({
        success: false,
        message: 'Pixel ID يجب أن يتكون من 14 إلى 18 رقماً',
      });
    }

    const createdPixel = await runStorefrontSettingsQuery((prisma) =>
      prisma.$transaction(async (tx) => {
        const settings = await tx.storefrontSettings.findUnique({
          where: { companyId },
          include: {
            facebookPixelConfigs: true,
          },
        });

        const existingPixel = settings.facebookPixelConfigs.find(
          (pixel) => pixel.pixelId === pixelId
        );
        if (existingPixel) {
          const duplicateError = new Error('Pixel already exists');
          duplicateError.statusCode = 409;
          throw duplicateError;
        }

        const shouldBePrimary =
          payload.isPrimary === true || settings.facebookPixelConfigs.length === 0;

        if (shouldBePrimary) {
          await tx.facebookPixelConfig.updateMany({
            where: { storefrontSettingsId: settings.id },
            data: { isPrimary: false },
          });
        }

        const created = await tx.facebookPixelConfig.create({
          data: {
            id: crypto.randomUUID(),
            storefrontSettingsId: settings.id,
            pixelId,
            pixelName,
            accessToken: trimToNull(payload.accessToken),
            isActive: payload.isActive ?? true,
            isPrimary: shouldBePrimary,
            trackPageView: payload.trackPageView,
            trackViewContent: payload.trackViewContent,
            trackAddToCart: payload.trackAddToCart,
            trackInitiateCheckout: payload.trackInitiateCheckout,
            trackPurchase: payload.trackPurchase,
            trackSearch: payload.trackSearch,
            trackAddToWishlist: payload.trackAddToWishlist,
            trackLead: payload.trackLead,
            trackCompleteRegistration: payload.trackCompleteRegistration,
          },
        });

        if (shouldBePrimary) {
          await syncPrimaryPixelToSettings(tx, companyId, created);
        }

        return created;
      })
    );

    return res.json({
      success: true,
      message: 'تم إضافة Pixel بنجاح',
      data: serializePixelConfig(createdPixel),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 409 ? 'هذا الـ Pixel مضاف بالفعل لهذه الشركة' : 'فشل إضافة Pixel',
      error: error.message,
    });
  }
};

const updatePixel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const pixelRecordId = req.params.id;
    const payload = sanitizePixelConfigPayload(req.body || {}, { partial: true });

    const updatedPixel = await runStorefrontSettingsQuery((prisma) =>
      prisma.$transaction(async (tx) => {
        const settings = await tx.storefrontSettings.findUnique({
          where: { companyId },
          include: {
            facebookPixelConfigs: true,
          },
        });

        if (!settings) {
          const notFoundError = new Error('Company not found');
          notFoundError.statusCode = 404;
          throw notFoundError;
        }

        const currentPixel = settings.facebookPixelConfigs.find(
          (pixel) => pixel.id === pixelRecordId
        );
        if (!currentPixel) {
          const notFoundError = new Error('Pixel not found');
          notFoundError.statusCode = 404;
          throw notFoundError;
        }

        if (payload.pixelId && !PIXEL_ID_PATTERN.test(payload.pixelId)) {
          const validationError = new Error('Pixel ID must be 14-18 digits');
          validationError.statusCode = 400;
          throw validationError;
        }

        if (payload.isPrimary === true) {
          await tx.facebookPixelConfig.updateMany({
            where: {
              storefrontSettingsId: settings.id,
              NOT: { id: pixelRecordId },
            },
            data: { isPrimary: false },
          });
        }

        const updated = await tx.facebookPixelConfig.update({
          where: { id: pixelRecordId },
          data: {
            ...payload,
            ...(payload.accessToken !== undefined
              ? { accessToken: trimToNull(payload.accessToken) }
              : {}),
          },
        });

        if (payload.isPrimary === true || currentPixel.isPrimary) {
          const nextPrimary =
            payload.isPrimary === true
              ? updated
              : settings.facebookPixelConfigs.find(
                  (pixel) => pixel.id !== pixelRecordId && pixel.isPrimary
                ) || updated;
          await syncPrimaryPixelToSettings(tx, companyId, nextPrimary);
        }

        return updated;
      })
    );

    return res.json({
      success: true,
      message: 'تم تحديث Pixel بنجاح',
      data: serializePixelConfig(updatedPixel),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 400
          ? 'Pixel ID يجب أن يكون 16 رقم'
          : statusCode === 404
          ? 'لم يتم العثور على Pixel المطلوب'
          : 'فشل تحديث Pixel',
      error: error.message,
    });
  }
};

const deletePixel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const pixelRecordId = req.params.id;

    await runStorefrontSettingsQuery((prisma) =>
      prisma.$transaction(async (tx) => {
        const settings = await tx.storefrontSettings.findUnique({
          where: { companyId },
          include: {
            facebookPixelConfigs: {
              orderBy: [{ isPrimary: 'desc' }, { isActive: 'desc' }, { createdAt: 'asc' }],
            },
          },
        });

        if (!settings) {
          const notFoundError = new Error('Company not found');
          notFoundError.statusCode = 404;
          throw notFoundError;
        }

        const pixel = settings.facebookPixelConfigs.find((item) => item.id === pixelRecordId);
        if (!pixel) {
          const notFoundError = new Error('Pixel not found');
          notFoundError.statusCode = 404;
          throw notFoundError;
        }

        await tx.facebookPixelConfig.delete({
          where: { id: pixelRecordId },
        });

        if (pixel.isPrimary || settings.facebookPixelId === pixel.pixelId) {
          const remainingPixels = settings.facebookPixelConfigs.filter(
            (item) => item.id !== pixelRecordId
          );
          const replacement = remainingPixels.find((item) => item.isActive) || remainingPixels[0];

          if (replacement) {
            await tx.facebookPixelConfig.update({
              where: { id: replacement.id },
              data: { isPrimary: true },
            });
          }

          await syncPrimaryPixelToSettings(tx, companyId, replacement || null);
        }
      })
    );

    return res.json({
      success: true,
      message: 'تم حذف Pixel بنجاح',
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404 ? 'لم يتم العثور على Pixel المطلوب' : 'فشل حذف Pixel',
      error: error.message,
    });
  }
};

const testPixelById = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.json({
        success: false,
        data: {
          success: false,
          message: 'Company context is required',
        },
      });
    }

    const pixelRecordId = req.params.id;
    const context = await getStorefrontContext(companyId, { includePixels: true });
    if (!context) {
      return res.json({
        success: false,
        data: {
          success: false,
          message: 'Company not found',
        },
      });
    }

    const pixelConfig = (context.settings.facebookPixelConfigs || []).find(
      (pixel) => pixel.id === pixelRecordId
    );

    if (!pixelConfig) {
      return res.json({
        success: false,
        data: {
          success: false,
          message: 'Pixel not found',
        },
      });
    }

    const accessToken = getPrimaryManagementToken({
      company: context.company,
      settings: context.settings,
      pixelConfig,
    });

    if (!accessToken) {
      await runStorefrontSettingsQuery((prisma) =>
        prisma.facebookPixelConfig.update({
          where: { id: pixelRecordId },
          data: {
            lastTestAt: new Date(),
            lastTestResult: 'missing_token',
            tokenStatus: 'missing',
          },
        })
      );

      return res.json({
        success: false,
        data: {
          success: false,
          message: 'لا يوجد Access Token لهذا Pixel. أضف token يدويًا أو استخدم الربط السهل.',
        },
      });
    }

    try {
      const pixelData = await verifyPixelWithFacebook(pixelConfig.pixelId, accessToken);

      const updatedPixel = await runStorefrontSettingsQuery((prisma) =>
        prisma.facebookPixelConfig.update({
          where: { id: pixelRecordId },
          data: {
            lastTestAt: new Date(),
            lastTestResult: 'success',
            tokenStatus: 'valid',
            lastError: null,
          },
        })
      );

      return res.json({
        success: true,
        data: {
          success: true,
          message: `تم التحقق من Pixel بنجاح: ${pixelData.name || pixelData.id}`,
          pixel: serializePixelConfig(updatedPixel),
        },
      });
    } catch (error) {
      const updatedPixel = await runStorefrontSettingsQuery((prisma) =>
        prisma.facebookPixelConfig.update({
          where: { id: pixelRecordId },
          data: {
            lastTestAt: new Date(),
            lastTestResult: 'failed',
            tokenStatus: isFacebookTokenError(error) ? 'invalid' : 'error',
            errorCount: {
              increment: 1,
            },
            lastError: getFacebookErrorMessage(error, 'فشل التحقق من Pixel'),
          },
        })
      );

      return res.json({
        success: false,
        data: {
          success: false,
          message: getFacebookErrorMessage(error, 'فشل التحقق من Pixel'),
          pixel: serializePixelConfig(updatedPixel),
        },
      });
    }
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to test pixel by id:', error);
    return res.json({
      success: false,
      data: {
        success: false,
        message: error.message,
      },
    });
  }
};

const getBusinessAccounts = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const context = await getStorefrontContext(companyId);
    if (!context) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const accessToken = trimToNull(context.company.facebookPixelAccessToken);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        needsAuth: true,
        message: 'يجب ربط حساب Facebook أولاً',
      });
    }

    try {
      const response = await axios.get(getFacebookGraphUrl('me/businesses'), {
        params: {
          access_token: accessToken,
          fields: 'id,name',
          limit: 100,
        },
      });

      return res.json({
        success: true,
        data: {
          businesses: response.data?.data || [],
        },
      });
    } catch (error) {
      const statusCode = isFacebookTokenError(error) ? 401 : 502;
      return res.status(statusCode).json({
        success: false,
        needsAuth: isFacebookTokenError(error),
        message: getFacebookErrorMessage(error, 'فشل جلب Business Accounts من Facebook'),
      });
    }
  } catch (error) {
    console.error('❌ [STOREFRONT-SETTINGS] Failed to load business accounts:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل جلب Business Accounts',
      error: error.message,
    });
  }
};

const createFacebookPixel = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const pixelName = trimToNull(req.body?.pixelName);
    const businessId = trimToNull(req.body?.businessId);

    if (!pixelName || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'اسم Pixel و Business Account مطلوبان',
      });
    }

    const context = await getStorefrontContext(companyId, { includePixels: true });
    if (!context) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const accessToken = trimToNull(context.company.facebookPixelAccessToken);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        needsAuth: true,
        message: 'يجب ربط حساب Facebook أولاً',
      });
    }

    const createResponse = await axios.post(
      getFacebookGraphUrl(`${businessId}/adspixels`),
      null,
      {
        params: {
          access_token: accessToken,
          name: pixelName,
        },
      }
    );

    const pixelId = trimToNull(createResponse.data?.id);
    if (!pixelId) {
      return res.status(502).json({
        success: false,
        message: 'لم يرجع Facebook معرف Pixel صالح',
      });
    }

    const createdPixel = await runStorefrontSettingsQuery((prisma) =>
      prisma.$transaction(async (tx) => {
        const settings = await tx.storefrontSettings.findUnique({
          where: { companyId },
          include: {
            facebookPixelConfigs: true,
          },
        });

        const shouldBePrimary = settings.facebookPixelConfigs.length === 0;

        if (shouldBePrimary) {
          await tx.facebookPixelConfig.updateMany({
            where: { storefrontSettingsId: settings.id },
            data: { isPrimary: false },
          });
        }

        const created = await tx.facebookPixelConfig.create({
          data: {
            id: crypto.randomUUID(),
            storefrontSettingsId: settings.id,
            pixelId,
            pixelName,
            isPrimary: shouldBePrimary,
            isActive: true,
          },
        });

        if (shouldBePrimary) {
          await syncPrimaryPixelToSettings(tx, companyId, created);
        }

        return created;
      })
    );

    return res.json({
      success: true,
      message: 'تم إنشاء Pixel بنجاح',
      data: {
        pixelId,
        pixelName,
        businessId,
        pixel: serializePixelConfig(createdPixel),
      },
    });
  } catch (error) {
    const statusCode =
      isFacebookTokenError(error) || isFacebookPermissionError(error) ? 401 : 500;
    return res.status(statusCode).json({
      success: false,
      needsAuth: statusCode === 401,
      message: getFacebookErrorMessage(error, 'فشل إنشاء Pixel جديد في Facebook'),
      error: error.message,
    });
  }
};

// ─── Clarity Analytics ────────────────────────────────────────────

const clarityCache = new Map();
const CLARITY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getClarityAnalytics = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId required' });

    const cacheKey = `clarity_${companyId}`;
    const cached = clarityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLARITY_CACHE_TTL) {
      return res.json({ success: true, data: cached.data, cached: true });
    }

    const settings = await runStorefrontSettingsQuery((prisma) =>
      prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { clarityProjectId: true, clarityApiToken: true },
      }),
    );

    const projectId = settings?.clarityProjectId;
    const apiToken = settings?.clarityApiToken;

    if (!projectId || !apiToken) {
      return res.json({ success: true, data: null, message: 'Clarity غير مهيأ بالكامل' });
    }

    const response = await axios.get(
      'https://www.clarity.ms/export-data/api/v1/project-live-insights',
      {
        params: { numOfDays: 3 },
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    clarityCache.set(cacheKey, { data: response.data, timestamp: Date.now() });

    return res.json({ success: true, data: response.data, cached: false });
  } catch (error) {
    console.error('Clarity analytics fetch error:', error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'فشل جلب بيانات Clarity',
      error: error?.response?.data || error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
  testFacebookPixel,
  testFacebookCapi,
  sendTestEvent,
  getPixelDiagnostics,
  checkTokenPermissions,
  getPixels,
  addPixel,
  updatePixel,
  deletePixel,
  testPixelById,
  getBusinessAccounts,
  createFacebookPixel,
  getClarityAnalytics,
};
