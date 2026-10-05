const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { marketplaceCatalogService } = require('../services/catalog/marketplaceCatalogService');
const { buildInstalledMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');
const businessSpecialtyService = require('../services/businessSpecialtyService');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const { getDefaultAgentTemplateSlug, buildDefaultAgentConfig } = require('../utils/getDefaultAgentTemplate');
const { getCandidateAppSlugs } = require('../middleware/checkAppAccess');

// Legacy storefront template engine has been removed from runtime.
const PLATFORM_ENGINE_VERSION = 'removed';
const LEGACY_TEMPLATE_CATEGORIES = new Set(['TEMPLATE', 'THEME']);
const LEGACY_TEMPLATE_CATEGORY_VALUES = Array.from(LEGACY_TEMPLATE_CATEGORIES);

const LOG_FILE = path.join(__dirname, '../debug_marketplace.log');
const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL', 'active', 'trial'];
const LEGACY_AUTOMATION_CATEGORY = ['A', 'I'].join('');

function getMarketplaceCatalogSource() {
  const defaultSource = process.env.NODE_ENV === 'production' ? 'db' : 'hybrid';
  const source = String(process.env.CATALOG_SOURCE || defaultSource).trim().toLowerCase();
  if (source === 'file' || source === 'hybrid' || source === 'db') {
    return source;
  }
  return defaultSource;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLegacyTemplateCategory(category) {
  return LEGACY_TEMPLATE_CATEGORIES.has(String(category || '').trim().toUpperCase());
}

async function resolveMarketplaceSpecialtyFilter(user) {
  if (!user || !user.companyId) {
    return { applied: false, specialty: null, appSlugs: [] };
  }

  return businessSpecialtyService.getCompanySpecialtyAppSlugs(user.companyId);
}

function isAppRecommendedForSpecialty(slug, specialtyFilter) {
  if (!specialtyFilter?.applied) return false;
  return specialtyFilter.appSlugs.includes(String(slug || '').trim());
}

async function enrichAppsWithDbState(apps, user) {
  if (!Array.isArray(apps) || apps.length === 0) {
    return [];
  }

  const slugs = Array.from(new Set(
    apps
      .map((app) => app?.slug)
      .filter((slug) => typeof slug === 'string' && slug.trim().length > 0)
  ));

  if (slugs.length === 0) {
    return apps.map((app) => ({
      ...app,
      isInstalled: false,
      activePricingModel: null
    }));
  }

  const dbApps = await executeWithRetry(async () => {
    return await getSharedPrismaClient().marketplaceApp.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        logo: true,
        coverImage: true,
        installCount: true,
        rating: true,
        reviewCount: true,
        monthlyPrice: true,
        yearlyPrice: true,
        pricingModel: true,
        unitPrice: true,
        unitName: true,
        ppuBillingMethod: true,
        trialDays: true
      }
    });
  });

  const dbBySlug = new Map(dbApps.map((app) => [app.slug, app]));
  const dbById = new Map(dbApps.map((app) => [app.id, app]));
  const installedByAppId = new Map();
  const installedSlugSet = new Set();

  if (user && user.companyId) {
    const installedApps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findMany({
        where: {
          companyId: user.companyId
        },
        select: {
          appId: true,
          status: true,
          activePricingModel: true,
          app: {
            select: {
              slug: true
            }
          }
        }
      });
    });

    installedApps.forEach((installation) => {
      if (ACTIVE_STATUSES.includes(installation.status)) {
        installedByAppId.set(installation.appId, installation.activePricingModel || null);
        const slug = installation.app?.slug || dbById.get(installation.appId)?.slug;
        if (slug) {
          installedSlugSet.add(slug);
        }
      }
    });
  }

  return apps.map((app) => {
    const dbApp = dbBySlug.get(app.slug);
    const installCount = dbApp ? toSafeNumber(dbApp.installCount, 0) : toSafeNumber(app.installCount, 0);
    const rating = dbApp ? toSafeNumber(dbApp.rating, 0) : toSafeNumber(app.rating, 0);
    const reviewCount = dbApp ? toSafeNumber(dbApp.reviewCount, 0) : toSafeNumber(app.reviewCount, 0);
    const appId = dbApp ? dbApp.id : (app.id || `file-${app.slug}`);
    const isDirectlyInstalled = dbApp ? installedByAppId.has(dbApp.id) : false;
    let isInstalled = isDirectlyInstalled;
    let isIncludedInPlan = false;

    if (!isDirectlyInstalled && user && user.companyId) {
      const candidates = typeof getCandidateAppSlugs === 'function' ? getCandidateAppSlugs(app.slug) : [];
      const coveringSlug = candidates.find((cand) => cand !== app.slug && installedSlugSet.has(cand));
      if (coveringSlug) {
        isInstalled = true;
        isIncludedInPlan = true;
      }
    }

    const activePricingModel = dbApp ? (installedByAppId.get(dbApp.id) || null) : null;

    // 🛡️ Live Database metadata & pricing take absolute precedence over static file catalog:
    const name = dbApp?.name || app.name;
    const description = dbApp?.description || app.description;
    const icon = dbApp?.icon || app.icon;
    const logo = dbApp?.logo || app.logo;
    const coverImage = dbApp?.coverImage || app.coverImage;

    const monthlyPrice = dbApp?.monthlyPrice !== undefined && dbApp?.monthlyPrice !== null
      ? toSafeNumber(dbApp.monthlyPrice, 0)
      : app.monthlyPrice;
    const yearlyPrice = dbApp?.yearlyPrice !== undefined && dbApp?.yearlyPrice !== null
      ? toSafeNumber(dbApp.yearlyPrice, 0)
      : app.yearlyPrice;
    const pricingModel = dbApp?.pricingModel ? dbApp.pricingModel : app.pricingModel;
    const unitPrice = dbApp?.unitPrice !== undefined
      ? (dbApp.unitPrice === null ? null : toSafeNumber(dbApp.unitPrice, 0))
      : app.unitPrice;
    const unitName = dbApp?.unitName !== undefined ? dbApp.unitName : app.unitName;
    const ppuBillingMethod = dbApp?.ppuBillingMethod || app.ppuBillingMethod;
    const trialDays = dbApp?.trialDays !== undefined && dbApp?.trialDays !== null
      ? toSafeNumber(dbApp.trialDays, 0)
      : app.trialDays;

    return {
      ...app,
      id: appId,
      name,
      description,
      icon,
      logo,
      coverImage,
      monthlyPrice,
      yearlyPrice,
      pricingModel,
      unitPrice,
      unitName,
      ppuBillingMethod,
      trialDays,
      installCount,
      rating,
      reviewCount,
      _count: {
        installations: installCount,
        reviews: reviewCount
      },
      isInstalled,
      isIncludedInPlan,
      activePricingModel
    };
  });
}

const VALID_PRICING_MODELS = new Set(['FREE', 'SUBSCRIPTION', 'PAY_PER_USE']);

function normalizePricingModel(value, fallback = 'SUBSCRIPTION') {
  const normalized = String(value || '').trim().toUpperCase();
  if (VALID_PRICING_MODELS.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Keep fallback below
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeJsonPayload(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return value;
}

function normalizeMarketplaceAppForApi(app) {
  if (!app || typeof app !== 'object') {
    return app;
  }

  return {
    ...app,
    features: normalizeJsonPayload(app.features, {}),
    requiredApps: normalizeStringArray(app.requiredApps),
    ...(app.positioning !== undefined
      ? { positioning: normalizeJsonPayload(app.positioning, null) }
      : {}),
    ...(app.limitations !== undefined
      ? { limitations: normalizeJsonPayload(app.limitations, null) }
      : {})
  };
}

function createAlreadyInstalledError(existing) {
  const error = new Error('الأداة مفعلة بالفعل بنفس نظام الدفع');
  error.code = 'APP_ALREADY_INSTALLED';
  error.existing = existing;
  return error;
}

async function ensureCompanyAppInstalled(tx, {
  companyId,
  app,
  pricingModel,
  billingCycle = 'monthly',
  visited = new Set(),
  autoInstalledApps = [],
  allowAlreadyInstalled = true,
  recordAutoInstall = false,
  inTrial = false,
  inTrialEndsAt = null
}) {
  const normalizedSlug = String(app?.slug || '').trim();
  if (!normalizedSlug) {
    throw new Error('App slug is required for installation');
  }

  if (visited.has(normalizedSlug)) {
    return autoInstalledApps;
  }
  visited.add(normalizedSlug);

  const requiredAppSlugs = normalizeStringArray(app.requiredApps);
  if (requiredAppSlugs.length > 0) {
    const requiredResolution = await ensureDbAppsBySlugs(requiredAppSlugs, {
      onlyActive: true,
      onlyPublic: true
    });

    // Tolerate stale required-app references. Deprecated/removed slugs
    // (e.g. store-basic/store-pro/ecommerce-basic merged into `store`) can
    // linger in the DB even though the app row no longer resolves as an
    // active, public app. Blocking the install over a stale prerequisite
    // bricks every dependent app, so log it and continue — the feature-level
    // gate (checkAppAccess) still enforces access independently.
    if (requiredResolution.missingSlugs.length > 0) {
      for (const missingSlug of requiredResolution.missingSlugs) {
        console.warn(
          `[marketplace] Required app '${missingSlug}' for '${normalizedSlug}' is not an active/public app — skipping stale requirement.`
        );
      }
    }

    for (const requiredApp of requiredResolution.apps) {
      await ensureCompanyAppInstalled(tx, {
        companyId,
        app: requiredApp,
        pricingModel: normalizePricingModel(requiredApp.pricingModel, 'SUBSCRIPTION'),
        billingCycle,
        visited,
        autoInstalledApps,
        allowAlreadyInstalled: true,
        recordAutoInstall: true,
        inTrial,
        inTrialEndsAt
      });
    }
  }

  const existing = await tx.companyApp.findUnique({
    where: {
      companyId_appId: { companyId, appId: app.id }
    }
  });

  const requestedPricingModel = normalizePricingModel(
    pricingModel,
    normalizePricingModel(app.pricingModel, 'SUBSCRIPTION')
  );
  const normalizedBillingCycle = String(billingCycle || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
  const isYearly = normalizedBillingCycle === 'yearly';

  const isExpired = existing && existing.validUntil && new Date(existing.validUntil) < new Date();
  const existingSettings = typeof existing?.settings === 'string'
    ? (() => { try { return JSON.parse(existing.settings); } catch { return {}; } })()
    : (existing?.settings || {});
  const existingBillingCycle = existingSettings?.billing?.cycle || 'monthly';
  const isCycleChange = requestedPricingModel === 'SUBSCRIPTION' && existing?.activePricingModel === 'SUBSCRIPTION' && existingBillingCycle !== normalizedBillingCycle;
  const canTransition = existing && (
    existing.activePricingModel !== requestedPricingModel ||
    isCycleChange
  );
  const isInactive = existing && !ACTIVE_STATUSES.includes(existing.status);

  if (existing && !isInactive && !isExpired && !canTransition) {
    if (!allowAlreadyInstalled) {
      throw createAlreadyInstalledError(existing);
    }
    return autoInstalledApps;
  }

  const validUntilDays = isYearly ? 365 : 30;
  const validUntil = !inTrial && requestedPricingModel === 'SUBSCRIPTION' ? new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000) : null;
  const resolvedStatus = inTrial ? 'TRIAL' : 'ACTIVE';
  const resolvedTrialEnds = inTrial
    ? (inTrialEndsAt ? new Date(inTrialEndsAt) : existing?.trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    : existing?.trialEndsAt || null;
  const installedSettings = buildInstalledMarketplaceAppSettings(
    app.slug,
    existing?.settings,
    {
      general: {
        enabled: true,
      },
      billing: {
        cycle: normalizedBillingCycle,
        pricingModel: requestedPricingModel
      },
      installedInTrial: inTrial
    }
  );

  const nextBillingAt = !inTrial && requestedPricingModel === 'SUBSCRIPTION' ? new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000) : null;

  if (existing) {
    await tx.companyApp.update({
      where: { id: existing.id },
      data: {
        activePricingModel: requestedPricingModel,
        status: inTrial ? 'TRIAL' : 'ACTIVE',
        validUntil,
        trialEndsAt: resolvedTrialEnds,
        settings: installedSettings,
        nextBillingAt,
        updatedAt: new Date()
      }
    });
  } else {
    await tx.companyApp.create({
      data: {
        id: uuidv4(),
        companyId,
        appId: app.id,
        activePricingModel: requestedPricingModel,
        status: resolvedStatus,
        validUntil,
        trialEndsAt: resolvedTrialEnds,
        settings: installedSettings,
        nextBillingAt
      }
    });

    await tx.marketplaceApp.update({
      where: { id: app.id },
      data: { installCount: { increment: 1 } }
    });
  }

  if (recordAutoInstall) {
    autoInstalledApps.push({
      slug: app.slug,
      name: app.name
    });
  }

  return autoInstalledApps;
}

function normalizeJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Ignore parse errors and use fallback
    }
  }

  return fallback;
}

function buildDbAppPayloadFromCatalog(catalogApp) {
  const monthlyPrice = toSafeNumber(catalogApp?.monthlyPrice, 0);
  const yearlyPrice = toSafeNumber(catalogApp?.yearlyPrice, 0);
  const unitPriceRaw = catalogApp?.unitPrice;
  const unitPrice = unitPriceRaw === null || unitPriceRaw === undefined
    ? null
    : toSafeNumber(unitPriceRaw, 0);

  return {
    slug: String(catalogApp?.slug || '').trim(),
    name: String(catalogApp?.name || '').trim() || 'Untitled App',
    description: String(catalogApp?.description || '').trim(),
    logo: catalogApp?.logo || null,
    images: null,
    monthlyPrice,
    yearlyPrice,
    pricingModel: normalizePricingModel(catalogApp?.pricingModel, monthlyPrice === 0 ? 'FREE' : 'SUBSCRIPTION'),
    unitPrice,
    unitName: catalogApp?.unitName || null,
    ppuBillingMethod: catalogApp?.ppuBillingMethod || null,
    features: normalizeJsonObject(catalogApp?.features, {}),
    isActive: catalogApp?.isActive !== false,
    isPublic: catalogApp?.isPublic !== false,
    isFeatured: catalogApp?.isFeatured === true,
    requiredApps: normalizeStringArray(catalogApp?.requiredApps),
    trialDays: Math.max(0, Math.floor(toSafeNumber(catalogApp?.trialDays, 0))),
    mainRoute: null,
    adminRoute: null,
    category: String(catalogApp?.category || 'general').trim() || 'general',
    rating: toSafeNumber(catalogApp?.rating, 0),
    reviewCount: Math.max(0, Math.floor(toSafeNumber(catalogApp?.reviewCount, 0))),
    installCount: Math.max(0, Math.floor(toSafeNumber(catalogApp?.installCount, 0))),
    isPopular: catalogApp?.isPopular === true,
    engineCompatibility: catalogApp?.engineCompatibility || null,
    icon: catalogApp?.icon || null
  };
}

async function ensureDbAppBySlug(slug, options = {}) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return null;

  const onlyActive = options.onlyActive === true;
  const onlyPublic = options.onlyPublic === true;

  const dbApp = await executeWithRetry(async () => {
    return await getSharedPrismaClient().marketplaceApp.findUnique({
      where: { slug: normalizedSlug }
    });
  });

  if (dbApp) {
    if (isLegacyTemplateCategory(dbApp.category)) return null;
    if (onlyActive && !dbApp.isActive) return null;
    if (onlyPublic && !dbApp.isPublic) return null;
    if (getMarketplaceCatalogSource() !== 'db') {
      const catalogApp = await marketplaceCatalogService.getAppBySlug(normalizedSlug, { onlyActive, onlyPublic });
      if (catalogApp && !isLegacyTemplateCategory(catalogApp.category)) {
        const catalogRequired = normalizeStringArray(catalogApp.requiredApps);
        const dbRequired = normalizeStringArray(dbApp.requiredApps);
        if (JSON.stringify(catalogRequired) !== JSON.stringify(dbRequired)) {
          return executeWithRetry(async () => {
            return await getSharedPrismaClient().marketplaceApp.update({
              where: { id: dbApp.id },
              data: { requiredApps: catalogRequired, updatedAt: new Date() }
            });
          });
        }
      }
    }
    return dbApp;
  }

  if (getMarketplaceCatalogSource() === 'db') {
    return null;
  }

  const catalogApp = await marketplaceCatalogService.getAppBySlug(normalizedSlug, {
    onlyActive,
    onlyPublic
  });

  if (!catalogApp) {
    return null;
  }

  if (isLegacyTemplateCategory(catalogApp.category)) {
    return null;
  }

  const createPayload = buildDbAppPayloadFromCatalog(catalogApp);
  // 🛡️ Note: Never overwrite pricing or trial days for existing DB apps
  const updatePayload = {
    name: createPayload.name,
    description: createPayload.description,
    logo: createPayload.logo,
    features: createPayload.features,
    requiredApps: createPayload.requiredApps,
    category: createPayload.category,
    engineCompatibility: createPayload.engineCompatibility,
    icon: createPayload.icon,
    updatedAt: new Date()
  };

  return executeWithRetry(async () => {
    return await getSharedPrismaClient().marketplaceApp.upsert({
      where: { slug: normalizedSlug },
      update: updatePayload,
      create: createPayload
    });
  });
}

async function ensureDbAppsBySlugs(slugs, options = {}) {
  const uniqueSlugs = Array.from(new Set(
    normalizeStringArray(slugs)
  ));

  if (uniqueSlugs.length === 0) {
    return { apps: [], missingSlugs: [] };
  }

  const resolved = await Promise.all(
    uniqueSlugs.map(async (slug) => {
      const app = await ensureDbAppBySlug(slug, options);
      return { slug, app };
    })
  );

  return {
    apps: resolved.filter((entry) => !!entry.app).map((entry) => entry.app),
    missingSlugs: resolved.filter((entry) => !entry.app).map((entry) => entry.slug)
  };
}

async function getCatalogAppMetadataMap() {
  try {
    const snapshot = await marketplaceCatalogService.getSnapshot();
    return new Map(
      (snapshot.apps || []).map((app) => [
        app.slug,
        {
          features: app.features,
          positioning: app.positioning
        }
      ])
    );
  } catch (error) {
    return new Map();
  }
}

function withCatalogAppMetadata(app, catalogAppMetadataMap) {
  const catalogMetadata = catalogAppMetadataMap.get(app?.slug);
  if (!catalogMetadata || typeof catalogMetadata !== 'object' || Array.isArray(catalogMetadata)) {
    return normalizeMarketplaceAppForApi(app);
  }

  const catalogFeatures = normalizeJsonObject(catalogMetadata.features, null);
  const catalogPositioning = normalizeJsonObject(catalogMetadata.positioning, null);

  return normalizeMarketplaceAppForApi({
    ...app,
    ...(catalogFeatures ? { features: catalogFeatures } : {}),
    ...(catalogPositioning ? { positioning: catalogPositioning } : {})
  });
}

async function resolveBundleAppsForList(appTokens) {
  const tokens = normalizeStringArray(appTokens);
  if (tokens.length === 0) {
    return [];
  }

  const uniqueTokens = Array.from(new Set(tokens));
  const apps = await getSharedPrismaClient().marketplaceApp.findMany({
    where: {
      isActive: true,
      isPublic: true,
      category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES },
      OR: [
        { id: { in: uniqueTokens } },
        { slug: { in: uniqueTokens } }
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      monthlyPrice: true,
      logo: true
    }
  });

  const appByToken = new Map();
  apps.forEach((app) => {
    appByToken.set(app.id, app);
    appByToken.set(app.slug, app);
  });

  return tokens
    .map((token) => appByToken.get(token))
    .filter(Boolean)
    .filter((app, index, collection) =>
      collection.findIndex((candidate) => candidate.id === app.id) === index
    );
}

async function resolveBundleForWrite(slug) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) {
    return { bundle: null, source: 'invalid', missingAppSlugs: [] };
  }

  const catalogSource = getMarketplaceCatalogSource();

  // In file/hybrid mode, the page shows catalog bundles. Prefer that same
  // source for writes so the subscribed apps always match the visible card.
  if (catalogSource !== 'db') {
    const catalogBundle = await marketplaceCatalogService.getBundleBySlug(normalizedSlug, {
      onlyActive: true
    });

    if (catalogBundle) {
      const bundleAppSlugs = normalizeStringArray(
        catalogBundle.appSlugs || (catalogBundle.apps || []).map((app) => app.slug),
      );
      const { apps, missingSlugs } = await ensureDbAppsBySlugs(bundleAppSlugs, {
        onlyActive: true,
        onlyPublic: true
      });

      return {
        bundle: {
          id: catalogBundle.id || `catalog-${catalogBundle.slug}`,
          slug: catalogBundle.slug,
          name: catalogBundle.name,
          description: catalogBundle.description || '',
          monthlyPrice: toSafeNumber(catalogBundle.monthlyPrice, 0),
          yearlyPrice: catalogBundle.yearlyPrice === null || catalogBundle.yearlyPrice === undefined
            ? null
            : toSafeNumber(catalogBundle.yearlyPrice, 0),
          discount: toSafeNumber(catalogBundle.discount, 0),
          trialDays: toSafeNumber(catalogBundle.trialDays, 0),
          isActive: catalogBundle.isActive !== false,
          isFeatured: catalogBundle.isFeatured === true,
          appIds: apps.map((app) => app.id),
          appSlugs: bundleAppSlugs
        },
        source: 'catalog',
        missingAppSlugs: missingSlugs
      };
    }
  }

  const dbBundle = await executeWithRetry(async () => {
    return await getSharedPrismaClient().appBundle.findUnique({
      where: { slug: normalizedSlug }
    });
  });

  if (!dbBundle) {
    return {
      bundle: null,
      source: catalogSource === 'db' ? 'db' : 'catalog',
      missingAppSlugs: []
    };
  }

  const rawTokens = normalizeStringArray(dbBundle.appIds);
  if (rawTokens.length === 0) {
    return { bundle: { ...dbBundle, appIds: [] }, source: 'db', missingAppSlugs: [] };
  }

  const dbApps = await executeWithRetry(async () => {
    return await getSharedPrismaClient().marketplaceApp.findMany({
      where: {
        category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES },
        OR: [
          { id: { in: rawTokens } },
          { slug: { in: rawTokens } }
        ]
      },
      select: {
        id: true,
        slug: true
      }
    });
  });

  const idByToken = new Map();
  dbApps.forEach((app) => {
    idByToken.set(app.id, app.id);
    idByToken.set(app.slug, app.id);
  });

  const appIds = [];
  const missingTokens = [];
  rawTokens.forEach((token) => {
    const mappedId = idByToken.get(token);
    if (mappedId) {
      appIds.push(mappedId);
    } else {
      missingTokens.push(token);
    }
  });

  return {
    bundle: { ...dbBundle, appIds: Array.from(new Set(appIds)) },
    source: 'db',
    missingAppSlugs: missingTokens
  };
}

function logToFile(message, data = null) {
  if (process.env.NODE_ENV === 'production') return;
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n\n`;
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

exports.seedTemplates = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'تم إيقاف نظام قوالب المتجر القديم، لذلك زرع القوالب في الـ marketplace لم يعد متاحًا.'
  });
};

/**
 * @route GET /api/v1/marketplace/apps
 * @desc Get all marketplace apps with filtering
 * @access Public
 */
exports.getAllApps = async (req, res) => {
  try {
    const { category, search, sort = 'featured', page = 1, limit = 20 } = req.query;
    const catalogSource = getMarketplaceCatalogSource();
    const specialtyFilter = await resolveMarketplaceSpecialtyFilter(req.user);

    if (catalogSource !== 'db') {
      const catalogResult = await marketplaceCatalogService.getAllApps({
        category,
        search,
        sort,
        page,
        limit,
        onlyActive: true,
        onlyPublic: true
      });

      let apps = (catalogResult.data || []).map((app) => {
        const installCount = toSafeNumber(app.installCount, 0);
        const rating = toSafeNumber(app.rating, 0);
        const reviewCount = toSafeNumber(app.reviewCount, 0);
        return {
          ...app,
          installCount,
          rating,
          reviewCount,
          _count: {
            installations: installCount,
            reviews: reviewCount
          },
          isInstalled: false,
          activePricingModel: null
        };
      });
      apps = apps.filter((app) => !isLegacyTemplateCategory(app.category));

      if (catalogSource === 'hybrid') {
        apps = await enrichAppsWithDbState(apps, req.user);
      }
      apps = apps.map((app) => normalizeMarketplaceAppForApi({
        ...app,
        isRecommendedForSpecialty: isAppRecommendedForSpecialty(app.slug, specialtyFilter)
      }));


      return res.json({
        success: true,
        data: apps,
        platformEngineVersion: PLATFORM_ENGINE_VERSION,
        pagination: catalogResult.pagination,
        specialty: specialtyFilter.applied ? specialtyFilter.specialty : null,
        catalog: {
          source: catalogSource,
          ...(catalogResult.meta || {})
        }
      });
    }

    const where = { isActive: true, isPublic: true };

    if (category) {
      if (isLegacyTemplateCategory(category)) {
        return res.json({
          success: true,
          data: [],
          platformEngineVersion: PLATFORM_ENGINE_VERSION,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      where.category = category;
    } else {
      where.category = { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES };
    }

    if (search) {
      // DB-backed MarketplaceApp records do not persist catalog-only nameEn.
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    let orderBy = {};
    switch (sort) {
      case 'featured':
        orderBy = [{ isFeatured: 'desc' }, { isPopular: 'desc' }];
        break;
      case 'popular':
        orderBy = { installCount: 'desc' };
        break;
      case 'price_low':
        orderBy = { monthlyPrice: 'asc' };
        break;
      case 'price_high':
        orderBy = { monthlyPrice: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { isFeatured: 'desc' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rawApps, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().marketplaceApp.findMany({
          where,
          orderBy,
          skip,
          take: parseInt(limit),
          include: {
            _count: {
              select: { reviews: true, installations: true }
            }
          }
        }),
        getSharedPrismaClient().marketplaceApp.count({ where })
      ]);
    });

    const catalogAppMetadataMap = await getCatalogAppMetadataMap();
    const apps = rawApps.map((app) => ({
      ...withCatalogAppMetadata(app, catalogAppMetadataMap),
      isRecommendedForSpecialty: isAppRecommendedForSpecialty(app.slug, specialtyFilter)
    }));
    const effectiveTotal = total;

    // Check for installed apps if user is authenticated
    let installedApps = [];
    if (req.user && req.user.companyId && apps.length > 0) {
      logToFile('Checking installed check for user:', { userId: req.user.id, companyId: req.user.companyId });

      installedApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findMany({
          where: {
            companyId: req.user.companyId,
            appId: { in: apps.map(app => app.id) }
          },
          select: { appId: true, status: true, activePricingModel: true }
        });
      });

      logToFile('Installed apps query result:', installedApps);

      const activeStatuses = ['ACTIVE', 'TRIAL', 'active', 'trial'];
      const installedMap = new Map();
      installedApps.forEach(ia => {
        if (activeStatuses.includes(ia.status)) {
          installedMap.set(ia.appId, ia.activePricingModel);
        }
      });

      logToFile('Filtered installed map:', Array.from(installedMap.entries()));

      apps.forEach(app => {
        app.isInstalled = installedMap.has(app.id);
        app.activePricingModel = installedMap.get(app.id) || null;
      });
    } else {
      logToFile('Skipping install check:', {
        hasUser: !!req.user,
        companyId: req.user?.companyId,
        appsCount: apps.length
      });
      apps.forEach(app => {
        app.isInstalled = false;
      });
    }

    const response = {
      success: true,
      data: apps,
      platformEngineVersion: PLATFORM_ENGINE_VERSION,
      specialty: specialtyFilter.applied ? specialtyFilter.specialty : null,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: effectiveTotal,
        pages: Math.ceil(effectiveTotal / parseInt(limit))
      }
    };

    if (process.env.NODE_ENV === 'development') {
      response._debug = {
        isAuthenticated: !!req.user,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        appsCount: apps.length,
        foundInstallations: installedApps,
        hasInstalledAppsToCheck: apps.length > 0
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching marketplace apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/apps/:slug
 * @desc Get app details by slug
 * @access Public
 */
exports.getAppDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const catalogSource = getMarketplaceCatalogSource();

    if (catalogSource !== 'db') {
      const appFromCatalog = await marketplaceCatalogService.getAppBySlug(slug, {
        onlyActive: true,
        onlyPublic: true
      });

      if (!appFromCatalog) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      let app = {
        ...appFromCatalog,
        installCount: toSafeNumber(appFromCatalog.installCount, 0),
        rating: toSafeNumber(appFromCatalog.rating, 0),
        reviewCount: toSafeNumber(appFromCatalog.reviewCount, 0),
        reviews: [],
        pricingRules: [],
        _count: {
          installations: toSafeNumber(appFromCatalog.installCount, 0),
          reviews: toSafeNumber(appFromCatalog.reviewCount, 0)
        }
      };

      let isInstalled = false;
      let activePricingModel = null;

      if (catalogSource === 'hybrid') {
        const dbApp = await executeWithRetry(async () => {
          return await getSharedPrismaClient().marketplaceApp.findFirst({
            where: {
              slug,
              isActive: true,
              isPublic: true,
              category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
            },
            include: {
              reviews: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                where: { isPublished: true }
              },
              pricingRules: {
                where: { isActive: true }
              },
              _count: {
                select: { installations: true, reviews: true }
              }
            }
          });
        });

        if (dbApp) {
          const installCount = toSafeNumber(dbApp.installCount, app.installCount);
          const rating = toSafeNumber(dbApp.rating, app.rating);
          const reviewCount = toSafeNumber(dbApp.reviewCount, app.reviewCount);

          app = {
            ...app,
            id: dbApp.id,
            name: dbApp.name || app.name,
            description: dbApp.description || app.description,
            icon: dbApp.icon || app.icon,
            coverImage: dbApp.coverImage || app.coverImage,
            logo: dbApp.logo || app.logo,
            installCount,
            rating,
            reviewCount,
            reviews: dbApp.reviews || [],
            pricingRules: dbApp.pricingRules || [],
            _count: dbApp._count || {
              installations: installCount,
              reviews: reviewCount
            }
          };

          if (req.user && req.user.companyId) {
            const installation = await executeWithRetry(async () => {
              return await getSharedPrismaClient().companyApp.findFirst({
                where: {
                  companyId: req.user.companyId,
                  appId: dbApp.id
                },
                select: {
                  activePricingModel: true,
                  status: true,
                  trialEndsAt: true,
                  validUntil: true
                }
              });
            });

            if (installation) {
              const isTrialExpired = installation.status === 'TRIAL' && installation.trialEndsAt && new Date(installation.trialEndsAt) < new Date();
              const isSubExpired = installation.validUntil && new Date(installation.validUntil) < new Date();
              const isExpired = isTrialExpired || isSubExpired || installation.status === 'EXPIRED' || installation.status === 'CANCELLED';
              if (ACTIVE_STATUSES.includes(installation.status) && !isExpired) {
                isInstalled = true;
                activePricingModel = installation.activePricingModel || null;
              }
              app.installedApp = installation;
              app.isExpired = Boolean(isExpired);
            }
          }
        }
      }

      if (isLegacyTemplateCategory(app.category)) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      return res.json({
        success: true,
        data: normalizeMarketplaceAppForApi({
          ...app,
          isInstalled,
          activePricingModel
        })
      });
    }

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findFirst({
        where: {
          slug,
          isActive: true,
          isPublic: true,
          category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
        },
        include: {
          reviews: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            where: { isPublished: true }
          },
          pricingRules: {
            where: { isActive: true }
          },
          _count: {
            select: { installations: true, reviews: true }
          }
        }
      });
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    const catalogAppMetadataMap = await getCatalogAppMetadataMap();
    const appWithCatalogFeatures = withCatalogAppMetadata(app, catalogAppMetadataMap);

    // Check installation status if authenticated
    let isInstalled = false;
    let activePricingModel = null;
    let isExpired = false;
    let installedApp = null;

    if (req.user && req.user.companyId) {
      const installation = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findFirst({
          where: {
            companyId: req.user.companyId,
            appId: app.id
          },
          select: {
            activePricingModel: true,
            status: true,
            trialEndsAt: true,
            validUntil: true
          }
        });
      });

      if (installation) {
        installedApp = installation;
        const isTrialExpired = installation.status === 'TRIAL' && installation.trialEndsAt && new Date(installation.trialEndsAt) < new Date();
        const isSubExpired = installation.validUntil && new Date(installation.validUntil) < new Date();
        isExpired = Boolean(isTrialExpired || isSubExpired || installation.status === 'EXPIRED' || installation.status === 'CANCELLED');
        if (ACTIVE_STATUSES.includes(installation.status) && !isExpired) {
          isInstalled = true;
          activePricingModel = installation.activePricingModel;
        }
      }
    }

    res.json({
      success: true,
      data: normalizeMarketplaceAppForApi({
        ...appWithCatalogFeatures,
        isInstalled,
        activePricingModel,
        isExpired,
        installedApp
      })
    });
  } catch (error) {
    console.error('Error fetching app details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app details'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/categories
 * @desc Get all app categories with counts
 * @access Public
 */
exports.getCategories = async (req, res) => {
  try {
    const catalogSource = getMarketplaceCatalogSource();
    const specialtyFilter = await resolveMarketplaceSpecialtyFilter(req.user);

    if (catalogSource !== 'db') {
      const categoriesResult = await marketplaceCatalogService.getCategories({
        onlyActive: true,
        onlyPublic: true
      });

      let categories = (categoriesResult.data || []).map((category) => ({
        category: category.category,
        count: toSafeNumber(category.count, 0),
        name: category.name || category.category,
        nameEn: category.nameEn || category.category,
        icon: category.icon || category.iconKey || 'Package',
        iconKey: category.iconKey || null
      }));

      return res.json({
        success: true,
        data: categories.filter((category) => !isLegacyTemplateCategory(category.category)),
        specialty: specialtyFilter.applied ? specialtyFilter.specialty : null,
        catalog: {
          source: catalogSource,
          ...(categoriesResult.meta || {})
        },
        _v: 'catalog-v1'
      });
    }

    const categories = await executeWithRetry(async () => {
      const where = {
        isActive: true,
        isPublic: true,
        category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
      };

      return await getSharedPrismaClient().marketplaceApp.groupBy({
        by: ['category'],
        where,
        _count: {
          id: true
        }
      });
    });

    const categoryMap = {
      ECOMMERCE: { name: 'المتجر والمنتجات', nameEn: 'Store & Products', icon: '🛒' },
      ORDER_OPS: { name: 'الطلبات والتنفيذ', nameEn: 'Orders & Fulfillment', icon: '📝' },
      WAREHOUSE: { name: 'المخزون والمستودعات', nameEn: 'Inventory & Warehousing', icon: '📦' },
      SHIPPING: { name: 'الشحن والتوصيل', nameEn: 'Shipping & Delivery', icon: '🚚' },
      ACCOUNTING: { name: 'الفواتير والمحاسبة', nameEn: 'Invoicing & Accounting', icon: '🧾' },
      PAYMENTS: { name: 'الدفع والتحصيل', nameEn: 'Payments & Collections', icon: '💳' },
      PROCUREMENT: { name: 'المشتريات والموردين', nameEn: 'Procurement & Suppliers', icon: '🛍️' },
      WHOLESALE: { name: 'البيع بالجملة', nameEn: 'Wholesale & B2B', icon: '🏪' },
      SALES: { name: 'المبيعات', nameEn: 'Sales', icon: '🛒' },
      HR: { name: 'الموارد البشرية', nameEn: 'HR', icon: '👥' },
        [LEGACY_AUTOMATION_CATEGORY]: { name: 'الأتمتة', nameEn: 'Automation', icon: '⚙️' },
      COMMUNICATION: { name: 'التواصل', nameEn: 'Communication', icon: '💬' },
      CRM: { name: 'إدارة العملاء', nameEn: 'CRM', icon: '📊' },
      ANALYTICS: { name: 'التحليلات', nameEn: 'Analytics', icon: '📈' },
      INTEGRATION: { name: 'التكاملات', nameEn: 'Integrations', icon: '🔗' },
      PRODUCTIVITY: { name: 'الإنتاجية', nameEn: 'Productivity', icon: '⚡' },
      FINANCE: { name: 'المالية', nameEn: 'Finance', icon: '💰' },
      MARKETING: { name: 'التسويق', nameEn: 'Marketing', icon: '📣' },
      SUPPORT: { name: 'الدعم وخدمة العملاء', nameEn: 'Support', icon: '🎧' },
      WHATSAPP: { name: 'واتساب', nameEn: 'WhatsApp', icon: '💬' },
      SEO: { name: 'تحسين محركات البحث', nameEn: 'SEO', icon: '🌐' },
      THEMES: { name: 'الثيمات والقوالب', nameEn: 'Themes', icon: '🎨' },
      DESIGN: { name: 'التصميم', nameEn: 'Design', icon: '🎨' },
      GAMIFICATION: { name: 'الألعاب والترفيه', nameEn: 'Gamification', icon: '🎮' },
      MEDICAL: { name: 'النظام الطبي', nameEn: 'Medical System', icon: '🏥' }
    };

    console.log('🔍 [Marketplace] Fetching categories from DB...');
    const result = categories.map(cat => {
      if (!categoryMap[cat.category]) {
        console.warn(`⚠️ [Marketplace] Unknown category found in DB: ${cat.category}`);
      }
      return {
        category: cat.category,
        count: cat._count.id,
        ...(categoryMap[cat.category] || { name: cat.category, nameEn: cat.category, icon: '📦' })
      };
    });

    console.log('✅ [Marketplace] Returning categories:', result.length);

    res.json({
      success: true,
      data: result,
      specialty: specialtyFilter.applied ? specialtyFilter.specialty : null,
      _v: '2026-02-17-0530'
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفئات'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/featured
 * @desc Get featured apps
 * @access Public
 */
exports.getFeaturedApps = async (req, res) => {
  try {
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: {
          isActive: true,
          isPublic: true,
          isFeatured: true,
          category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
        },
        take: 6,
        orderBy: { installCount: 'desc' }
      });
    });

    const catalogAppMetadataMap = await getCatalogAppMetadataMap();
    const appsWithCatalogFeatures = apps.map((app) =>
      withCatalogAppMetadata(app, catalogAppMetadataMap)
    );

    res.json({
      success: true,
      data: appsWithCatalogFeatures
    });
  } catch (error) {
    console.error('Error fetching featured apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات المميزة'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/bundles
 * @desc Get all app bundles
 * @access Public
 */
exports.getBundles = async (req, res) => {
  try {
    const catalogSource = getMarketplaceCatalogSource();
    const specialtyFilter = await resolveMarketplaceSpecialtyFilter(req.user);

    if (catalogSource !== 'db') {
      const bundlesResult = await marketplaceCatalogService.getAllBundles({
        onlyActive: true
      });

      let bundles = (bundlesResult.data || []).map((bundle) => ({
        ...bundle,
        monthlyPrice: toSafeNumber(bundle.monthlyPrice, 0),
        yearlyPrice: bundle.yearlyPrice === null ? null : toSafeNumber(bundle.yearlyPrice, 0),
        discount: toSafeNumber(bundle.discount, 0),
        price: toSafeNumber(bundle.monthlyPrice, 0)
      }));

      if (catalogSource === 'hybrid' && bundles.length > 0) {
        const allSlugs = Array.from(new Set(
          bundles.flatMap((bundle) => (bundle.apps || []).map((app) => app.slug)).filter(Boolean)
        ));

        if (allSlugs.length > 0) {
          const dbApps = await executeWithRetry(async () => {
            return await getSharedPrismaClient().marketplaceApp.findMany({
              where: {
                slug: { in: allSlugs },
                isActive: true,
                isPublic: true,
                category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
              },
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                monthlyPrice: true,
                logo: true
              }
            });
          });

          const dbBySlug = new Map(dbApps.map((app) => [app.slug, app]));

          bundles = bundles.map((bundle) => {
            const apps = (bundle.apps || [])
              .filter((app) => !isLegacyTemplateCategory(app.category))
              .map((app) => {
              const dbApp = dbBySlug.get(app.slug);
              if (!dbApp) return app;
              return {
                ...app,
                id: dbApp.id,
                name: dbApp.name || app.name,
                description: dbApp.description || app.description,
                monthlyPrice: toSafeNumber(dbApp.monthlyPrice, toSafeNumber(app.monthlyPrice, 0)),
                logo: dbApp.logo || app.logo || null
              };
            });

            return {
              ...bundle,
              appIds: apps.map((app) => app.id),
              apps
            };
          });
        }
      }

      return res.json({
        success: true,
        data: bundles,
        specialty: specialtyFilter.applied ? specialtyFilter.specialty : null,
        catalog: {
          source: catalogSource,
          ...(bundlesResult.meta || {})
        }
      });
    }

    let bundles = await executeWithRetry(async () => {
      const allBundles = await getSharedPrismaClient().appBundle.findMany({
        where: { isActive: true },
        orderBy: { isFeatured: 'desc' }
      });

      return Promise.all(
        allBundles.map(async (bundle) => {
          const bundleApps = await resolveBundleAppsForList(bundle.appIds);

          return {
            ...bundle,
            appIds: bundleApps.map((app) => app.id),
            apps: bundleApps,
            price: toSafeNumber(bundle.monthlyPrice, 0)
          };
        })
      );
    });

    res.json({
      success: true,
      data: bundles,
      specialty: specialtyFilter.applied ? specialtyFilter.specialty : null
    });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    console.error('Full error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الباقات'
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:slug/install
 * @desc Install an app for the company
 * @access Protected
 */
exports.installApp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ÙŠØ¬Ø¨ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø´Ø±ÙƒØ© Ù„Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¹Ù…Ù„ÙŠØ©'
      });
    }
    const { pricingModel, billingCycle } = req.body;
    const normalizedBillingCycle = String(billingCycle || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    const isYearly = normalizedBillingCycle === 'yearly';

    const app = await ensureDbAppBySlug(slug);

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    if (!app.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ù‡Ø°Ù‡ Ø§Ù„Ø£Ø¯Ø§Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹'
      });
    }

    const requestedPricingModel = normalizePricingModel(
      pricingModel,
      normalizePricingModel(app.pricingModel, 'SUBSCRIPTION')
    );

    // 🆓 Company-level free trial (تفعيل تجريبي): لو الشركة في فترة تجربة مجانية
    // فعّالة لكل التطبيقات → التثبيت مجاني بدون خصم من المحفظة أو فحص الرصيد.
    const trialCompany = await executeWithRetry(async () => {
      try {
        return await getSharedPrismaClient().company.findUnique({
          where: { id: companyId },
          select: { trialModeEnabled: true, trialEndsAt: true }
        });
      } catch (err) {
        return null;
      }
    });
    const isTrialActive = Boolean(
      trialCompany?.trialModeEnabled &&
      trialCompany?.trialEndsAt &&
      new Date(trialCompany.trialEndsAt) > new Date()
    );

    const installationResult = await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        const autoInstalledApps = [];
        await ensureCompanyAppInstalled(tx, {
          companyId,
          app,
          pricingModel: requestedPricingModel,
          billingCycle: normalizedBillingCycle,
          autoInstalledApps,
          allowAlreadyInstalled: false,
          inTrial: isTrialActive,
          inTrialEndsAt: isTrialActive ? trialCompany.trialEndsAt : null
        });

        const appInst = await tx.companyApp.findUnique({
          where: {
            companyId_appId: { companyId, appId: app.id }
          }
        });

        let wallet = await tx.companyWallet.findUnique({
          where: { companyId }
        });

        if (!wallet) {
          wallet = await tx.companyWallet.create({
            data: {
              id: uuidv4(),
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        }

        const cost =
          requestedPricingModel === 'SUBSCRIPTION'
            ? (isYearly ? Number(app.yearlyPrice || Number(app.monthlyPrice) * 12) : Number(app.monthlyPrice))
            : 0;

        // أثناء التجربة المجانية: لا يُخصم أي مبلغ (التثبيت مجاني بالكامل)
        const effectiveCost = isTrialActive ? 0 : cost;

        if (effectiveCost > 0 && Number(wallet.balance) < effectiveCost) {
          const err = new Error(
            `رصيد المحفظة غير كافٍ. المطلوب: ${effectiveCost} ${wallet.currency}، المتوفر: ${wallet.balance} ${wallet.currency}`
          );
          err.code = 'INSUFFICIENT_WALLET_BALANCE';
          err.requiredAmount = effectiveCost;
          err.currentBalance = Number(wallet.balance);
          err.currency = wallet.currency;
          throw err;
        }

        if (effectiveCost > 0) {
          await tx.companyWallet.update({
            where: { companyId },
            data: {
              balance: { decrement: effectiveCost },
              totalSpent: { increment: effectiveCost }
            }
          });

          const cycleLabel = requestedPricingModel === 'SUBSCRIPTION'
            ? (isYearly ? ' (اشتراك سنوي)' : ' (اشتراك شهري)')
            : ' (حسب الاستخدام)';

          await tx.transaction.create({
            data: {
              id: uuidv4(),
              walletId: wallet.id,
              type: 'PAYMENT',
              amount: effectiveCost,
              description: `تفعيل ${app.name}${cycleLabel}`,
              referenceId: `APP_${app.slug}_${Date.now()}`
            }
          });
        }

        return {
          installation: appInst,
          autoInstalledApps
        };
      });
    });

    try {
      const client = getSharedPrismaClient();
      if (client?.activityLog?.create) {
        const userDisplayName = req.user?.name || req.user?.email || 'مستخدم النظام';
        const cycleLabel = requestedPricingModel === 'SUBSCRIPTION'
          ? (isYearly ? ' (اشتراك سنوي)' : ' (اشتراك شهري)')
          : (requestedPricingModel === 'FREE' ? ' (مجاني)' : ' (حسب الاستهلاك)');

        await client.activityLog.create({
          data: {
            userId: req.user?.id || null,
            companyId,
            category: 'MARKETPLACE',
            action: 'INSTALL_APP',
            description: `قام ${userDisplayName} بتثبيت وتفعيل تطبيق "${app.name}"${cycleLabel}`,
            targetType: 'APP',
            targetId: app.id,
            targetName: app.name,
            metadata: JSON.stringify({
              appSlug: app.slug,
              appName: app.name,
              pricingModel: requestedPricingModel,
              billingCycle: normalizedBillingCycle,
              cost: installationResult?.installation?.totalSpent || 0,
              trial: isTrialActive,
              installedAt: new Date().toISOString()
            }),
            severity: 'LOW',
            isSuccess: true
          }
        });
      }
    } catch (logErr) {
      console.warn('[marketplace] failed to create ActivityLog for install:', logErr.message);
    }

    res.json({
      success: true,
      message: isTrialActive
        ? `تم تفعيل ${app.name} بنجاح داخل الفترة التجريبية المجانية!`
        : `تم تفعيل ${app.name} بنجاح!`,
      data: {
        ...installationResult.installation,
        app: {
          name: app.name,
          slug: app.slug,
          icon: app.icon
        },
        autoInstalledRequiredApps: installationResult.autoInstalledApps,
        trial: isTrialActive
      }
    });
  } catch (error) {
    if (error.code === 'APP_ALREADY_INSTALLED') {
      return res.status(400).json({
        success: false,
        message: error.code === 'APP_ALREADY_INSTALLED' ? 'التطبيق مثبت بالفعل' : error.message,
        data: error.existing
      });
    }

    if (error.code === 'REQUIRED_APPS_MISSING') {
      return res.status(400).json({
        success: false,
        message: error.code === 'REQUIRED_APPS_MISSING' ? 'التطبيقات المطلوبة غير مثبتة' : error.message,
        requiredApps: error.requiredApps
      });
    }

    if (error.code === 'INSUFFICIENT_WALLET_BALANCE' || (error.message && error.message.includes('رصيد المحفظة'))) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: error.message || 'رصيد المحفظة غير كافٍ لإتمام التفعيل',
        requiredAmount: error.requiredAmount !== undefined ? error.requiredAmount : null,
        currentBalance: error.currentBalance !== undefined ? error.currentBalance : null,
        currency: error.currency || 'EGP'
      });
    }

    console.error('Error installing app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تفعيل الأداة'
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:slug/uninstall
 * @desc Uninstall an app
 * @access Protected
 */
exports.uninstallApp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ÙŠØ¬Ø¨ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø´Ø±ÙƒØ© Ù„Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¹Ù…Ù„ÙŠØ©'
      });
    }

    const app = await ensureDbAppBySlug(slug);

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Ø§Ù„Ø£Ø¯Ø§Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©'
      });
    }

    const installation = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findUnique({
        where: {
          companyId_appId: { companyId, appId: app.id }
        }
      });
    });

    if (!installation) {
      return res.status(404).json({
        success: false,
        message: 'Ø§Ù„Ø£Ø¯Ø§Ø© ØºÙŠØ± Ù…ÙØ¹Ù„Ø©'
      });
    }

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id: installation.id },
        data: {
          status: 'CANCELLED'
        }
      });
    });

    try {
      const client = getSharedPrismaClient();
      if (client?.activityLog?.create) {
        const userDisplayName = req.user?.name || req.user?.email || 'مستخدم النظام';
        await client.activityLog.create({
          data: {
            userId: req.user?.id || null,
            companyId,
            category: 'MARKETPLACE',
            action: 'UNINSTALL_APP',
            description: `قام ${userDisplayName} بإلغاء تثبيت تطبيق "${app.name}"`,
            targetType: 'APP',
            targetId: app.id,
            targetName: app.name,
            metadata: JSON.stringify({
              appSlug: app.slug,
              appName: app.name,
              uninstalledAt: new Date().toISOString()
            }),
            severity: 'MEDIUM',
            isSuccess: true
          }
        });
      }
    } catch (logErr) {
      console.warn('[marketplace] failed to create ActivityLog for uninstall:', logErr.message);
    }

    res.json({
      success: true,
      message: `تم إلغاء تثبيت ${app.name} بنجاح`
    });
  } catch (error) {
    console.error('Error uninstalling app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الأداة'
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:appId/review
 * @desc Add a review for an app
 * @access Protected
 */
exports.addReview = async (req, res) => {
  try {
    const { appId } = req.params;
    const { companyId, userId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ÙŠØ¬Ø¨ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø´Ø±ÙƒØ© Ù„Ø¥Ø¶Ø§ÙØ© ØªÙ‚ÙŠÙŠÙ…'
      });
    }
    const { rating, title, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Ø§Ù„ØªÙ‚ÙŠÙŠÙ… ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¨ÙŠÙ† 1 Ùˆ 5'
      });
    }

    const installation = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findUnique({
        where: {
          companyId_appId: { companyId, appId }
        }
      });
    });

    if (!installation) {
      return res.status(400).json({
        success: false,
        message: 'ÙŠØ¬Ø¨ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£Ø¯Ø§Ø© Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªÙ‚ÙŠÙŠÙ…Ù‡Ø§'
      });
    }

    const review = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appReview.upsert({
        where: {
          appId_companyId: { appId, companyId }
        },
        update: {
          rating,
          title,
          comment
        },
        create: {
          appId,
          companyId,
          userId,
          rating,
          title,
          comment,
          isVerified: true
        }
      });
    });

    await executeWithRetry(async () => {
      const result = await getSharedPrismaClient().appReview.aggregate({
        where: { appId, isPublished: true },
        _avg: { rating: true },
        _count: { id: true }
      });

      await getSharedPrismaClient().marketplaceApp.update({
        where: { id: appId },
        data: {
          rating: result._avg.rating,
          reviewCount: result._count.id
        }
      });

      return result._avg.rating;
    });

    res.json({
      success: true,
      message: 'Ø´ÙƒØ±Ø§Ù‹ Ù„ØªÙ‚ÙŠÙŠÙ…Ùƒ! ðŸŒŸ',
      data: review
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التقييم'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/bundles/:slug
 * @desc Get bundle details by slug
 * @access Public
 */
exports.getBundleDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const catalogSource = getMarketplaceCatalogSource();

    const companyId = req.user?.companyId;

    if (catalogSource !== 'db') {
      const bundleResult = await marketplaceCatalogService.getBundleBySlug(slug, {
        onlyActive: true
      });

      if (!bundleResult) {
        return res.status(404).json({
          success: false,
          message: 'Bundle not found'
        });
      }

      let bundle = {
        ...bundleResult,
        monthlyPrice: toSafeNumber(bundleResult.monthlyPrice, 0),
        yearlyPrice: bundleResult.yearlyPrice === null || bundleResult.yearlyPrice === undefined
          ? null
          : toSafeNumber(bundleResult.yearlyPrice, 0),
        discount: toSafeNumber(bundleResult.discount, 0),
        price: toSafeNumber(bundleResult.monthlyPrice, 0)
      };

      let appSlugs = Array.from(new Set((bundle.apps || []).map((app) => app.slug).filter(Boolean)));

      if (catalogSource === 'hybrid' && appSlugs.length > 0) {
        const dbApps = await executeWithRetry(async () => {
          return await getSharedPrismaClient().marketplaceApp.findMany({
            where: {
              slug: { in: appSlugs },
              isActive: true,
              isPublic: true,
              category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES }
            },
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              monthlyPrice: true,
              logo: true
            }
          });
        });

        const dbBySlug = new Map(dbApps.map((app) => [app.slug, app]));
        const mergedApps = (bundle.apps || [])
          .filter((app) => !isLegacyTemplateCategory(app.category))
          .map((app) => {
          const dbApp = dbBySlug.get(app.slug);
          if (!dbApp) return app;
          return {
            ...app,
            id: dbApp.id,
            name: dbApp.name || app.name,
            description: dbApp.description || app.description,
            monthlyPrice: toSafeNumber(dbApp.monthlyPrice, toSafeNumber(app.monthlyPrice, 0)),
            logo: dbApp.logo || app.logo || null
          };
        });

        bundle = {
          ...bundle,
          apps: mergedApps,
          appIds: mergedApps.map((app) => app.id)
        };
      }

      if (companyId && appSlugs.length > 0) {
        try {
          const prisma = getSharedPrismaClient();
          const companyApps = await prisma.companyApp.findMany({
            where: {
              companyId,
              app: { slug: { in: appSlugs } },
              status: { in: ['ACTIVE', 'TRIAL'] }
            },
            select: { appId: true, app: { select: { slug: true } } }
          });
          const installedSlugs = new Set(companyApps.map((ca) => ca.app.slug));
          const allInstalled = appSlugs.every((s) => installedSlugs.has(s));
          bundle = { ...bundle, isInstalled: allInstalled };
        } catch (e) {
          console.warn('[BUNDLE-DETAILS] Failed to check activation:', e.message);
        }
      }

      return res.json({
        success: true,
        data: bundle
      });
    }

    let bundle = await executeWithRetry(async () => {
      const dbBundle = await getSharedPrismaClient().appBundle.findFirst({
        where: { slug, isActive: true }
      });

      if (!dbBundle) {
        return null;
      }

      const rawTokens = normalizeStringArray(dbBundle.appIds);
      const apps = rawTokens.length > 0
        ? await getSharedPrismaClient().marketplaceApp.findMany({
          where: {
            isActive: true,
            isPublic: true,
            category: { notIn: LEGACY_TEMPLATE_CATEGORY_VALUES },
            OR: [
              { id: { in: rawTokens } },
              { slug: { in: rawTokens } }
            ]
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            monthlyPrice: true,
            logo: true
          }
        })
        : [];

      const appByToken = new Map();
      apps.forEach((app) => {
        appByToken.set(app.id, app);
        appByToken.set(app.slug, app);
      });

      const bundleApps = rawTokens
        .map((token) => appByToken.get(token))
        .filter(Boolean);

      return {
        ...dbBundle,
        appIds: bundleApps.map((app) => app.id),
        apps: bundleApps,
        price: toSafeNumber(dbBundle.monthlyPrice, 0)
      };
    });

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    if (companyId && bundle.apps?.length > 0) {
      try {
        const prisma = getSharedPrismaClient();
        const appSlugs = bundle.apps.map((a) => a.slug).filter(Boolean);
        const companyApps = await prisma.companyApp.findMany({
          where: {
            companyId,
            app: { slug: { in: appSlugs } },
            status: { in: ['ACTIVE', 'TRIAL'] }
          },
          select: { appId: true, app: { select: { slug: true } } }
        });
        const installedSlugs = new Set(companyApps.map((ca) => ca.app.slug));
        bundle = { ...bundle, isInstalled: appSlugs.every((s) => installedSlugs.has(s)) };
      } catch (e) {
        console.warn('[BUNDLE-DETAILS] Failed to check activation:', e.message);
      }
    }

    return res.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Error fetching bundle details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bundle details'
    });
  }
};

/**
 * @route POST /api/v1/marketplace/bundles/:slug/subscribe
 * @desc Subscribe to an app bundle
 * @access Protected
 */
exports.subscribeToBundle = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لإتمام العملية'
      });
    }

    const bundleResolution = await resolveBundleForWrite(slug);
    const bundle = bundleResolution.bundle;

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found'
      });
    }

    if (bundleResolution.missingAppSlugs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This bundle includes apps that are not available for installation.',
        missingApps: bundleResolution.missingAppSlugs
      });
    }

    if (!bundle.isActive) {
      return res.status(400).json({
        success: false,
        message: 'هذه الباقة غير مفعلة حالياً'
      });
    }

    if (slug === 'ai-inbox-bundle') {
      const prisma = getSharedPrismaClient();
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);
      await prisma.$transaction(async (tx) => {
        await tx.platformSubscription.upsert({
          where: { companyId },
          update: { status: 'ACTIVE', nextBillingDate, failedAttempts: 0, lastBillingDate: new Date() },
          create: { companyId, status: 'ACTIVE', nextBillingDate, billingDay: new Date().getDate(), failedAttempts: 0, lastBillingDate: new Date(), monthlyFee: 0 }
        });
        const appSlugs = ["ai-chat-basic", "unified-inbox", "whatsapp-business"];
        for (const slug of appSlugs) {
          const app = await tx.marketplaceApp.findUnique({ where: { slug } });
          if (app) {
            await tx.companyApp.upsert({
              where: { companyId_appId: { companyId, appId: app.id } },
              update: { status: 'ACTIVE' },
              create: { companyId, appId: app.id, status: 'ACTIVE' }
            });
          }
        }
      });
      try {
        const agentCfg = await buildDefaultAgentConfig();
        await aiServiceAdminClient.spawnAgent({
          companyId,
          templateSlug: agentCfg.templateSlug,
          name: agentCfg.name,
          icon: agentCfg.icon,
          config: agentCfg.config,
        });
      } catch (e) {
        console.warn('[BUNDLE-SUBSCRIBE] Auto-create agent skipped (non-blocking):', e.message);
      }
      return res.json({ success: true, message: "تم تفعيل باقة AI + Inbox بنجاح" });
    }

    const bundleAppIds = normalizeStringArray(bundle.appIds);
    if (bundleAppIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This bundle has no installable apps'
      });
    }

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        let wallet = await tx.companyWallet.findUnique({
          where: { companyId }
        });

        if (!wallet) {
          wallet = await tx.companyWallet.create({
            data: {
              id: uuidv4(),
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        }

        if (Number(wallet.balance) < Number(bundle.monthlyPrice)) {
          const err = new Error(`رصيد المحفظة غير كافٍ. المطلوب: ${bundle.monthlyPrice} ${wallet.currency}، المتوفر: ${wallet.balance} ${wallet.currency}`);
          err.code = 'INSUFFICIENT_WALLET_BALANCE';
          err.requiredAmount = Number(bundle.monthlyPrice);
          err.currentBalance = Number(wallet.balance);
          err.currency = wallet.currency;
          throw err;
        }

        await tx.companyWallet.update({
          where: { companyId },
          data: {
            balance: { decrement: Number(bundle.monthlyPrice) },
            totalSpent: { increment: Number(bundle.monthlyPrice) }
          }
        });

        await tx.transaction.create({
          data: {
            id: uuidv4(),
            walletId: wallet.id,
            type: 'PAYMENT',
            amount: bundle.monthlyPrice,
            description: `الاشتراك في باقة: ${bundle.name}`,
            referenceId: `BUNDLE_SUB_${bundle.slug}_${Date.now()}`
          }
        });

        const nextBillingAt = new Date();
        nextBillingAt.setDate(nextBillingAt.getDate() + 30);
        const bundleApps = await tx.marketplaceApp.findMany({
          where: { id: { in: bundleAppIds } },
          select: {
            id: true,
            slug: true,
          }
        });
        const bundleAppById = new Map(bundleApps.map((bundleApp) => [bundleApp.id, bundleApp]));
        const existingInstallations = await tx.companyApp.findMany({
          where: {
            companyId,
            appId: { in: bundleAppIds }
          },
          select: {
            id: true,
            appId: true,
            settings: true,
          }
        });
        const installationByAppId = new Map(
          existingInstallations.map((installation) => [installation.appId, installation]),
        );

        for (const appId of bundleAppIds) {
          const bundleApp = bundleAppById.get(appId);
          const existingInstallation = installationByAppId.get(appId);
          const mergedSettings = buildInstalledMarketplaceAppSettings(
            bundleApp?.slug || '',
            existingInstallation?.settings,
            {
              general: {
                enabled: true,
              },
              bundleInstallation: {
                isBundle: true,
                bundleSlug: bundle.slug,
                activatedAt: new Date().toISOString(),
              }
            },
          );

          if (existingInstallation) {
            await tx.companyApp.update({
              where: { id: existingInstallation.id },
              data: {
                status: 'ACTIVE',
                validUntil: nextBillingAt,
                settings: mergedSettings,
              }
            });
          } else {
            await tx.companyApp.create({
              data: {
                id: uuidv4(),
                companyId,
                appId,
                status: 'ACTIVE',
                validUntil: nextBillingAt,
                settings: mergedSettings,
              }
            });
          }

          await tx.marketplaceApp.update({
            where: { id: appId },
            data: { installCount: { increment: 1 } }
          });
        }
      }, {
        timeout: 20000
      });
    });

    try {
      const client = getSharedPrismaClient();
      if (client?.activityLog?.create) {
        const userDisplayName = req.user?.name || req.user?.email || 'مستخدم النظام';
        await client.activityLog.create({
          data: {
            userId: req.user?.id || null,
            companyId,
            category: 'MARKETPLACE',
            action: 'INSTALL_APP',
            description: `قام ${userDisplayName} بالاشتراك في باقة "${bundle.name}" وتفعيل ${bundleAppIds.length} أداة`,
            targetType: 'BUNDLE',
            targetId: bundle.id || bundle.slug,
            targetName: bundle.name,
            metadata: JSON.stringify({
              bundleSlug: bundle.slug,
              bundleName: bundle.name,
              appCount: bundleAppIds.length,
              subscribedAt: new Date().toISOString()
            }),
            severity: 'LOW',
            isSuccess: true
          }
        });
      }
    } catch (logErr) {
      console.warn('[marketplace] failed to create ActivityLog for bundle subscribe:', logErr.message);
    }

    res.json({ success: true, message: `تم الاشتراك في ${bundle.name} وتفعيل ${bundleAppIds.length} أداة بنجاح!` });

  } catch (error) {
    if (error.code === 'INSUFFICIENT_WALLET_BALANCE' || (error.message && error.message.includes('رصيد المحفظة'))) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: error.message || 'رصيد المحفظة غير كافٍ للاشتراك في هذه الباقة',
        requiredAmount: error.requiredAmount !== undefined ? error.requiredAmount : null,
        currentBalance: error.currentBalance !== undefined ? error.currentBalance : null,
        currency: error.currency || 'EGP'
      });
    }

    console.error('Error subscribing to bundle:', error);
    res.status(400).json({
      success: false,
      message: 'خطأ في الاشتراك في الباقة'
    });
  }
};

/**
 * @route GET /api/v1/marketplace/logs
 * @desc Get application activity / audit logs for the company (who installed or uninstalled apps)
 * @access Protected
 */
exports.getMarketplaceLogs = async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) {
      return res.json({
        success: true,
        data: {
          logs: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
          stats: { totalInstalls: 0, totalUninstalls: 0, totalActions: 0 }
        }
      });
    }

    const prisma = getSharedPrismaClient();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { action, search, startDate, endDate } = req.query;

    const where = {
      companyId,
      category: 'MARKETPLACE'
    };

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { targetName: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } }
      ];
    }

    const [logsRaw, total, installsCount, uninstallsCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.count({ where: { companyId, category: 'MARKETPLACE', action: 'INSTALL_APP' } }),
      prisma.activityLog.count({ where: { companyId, category: 'MARKETPLACE', action: 'UNINSTALL_APP' } })
    ]);

    let logs = logsRaw.map((log) => {
      let parsedMeta = null;
      if (log.metadata) {
        try {
          parsedMeta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        } catch {
          parsedMeta = null;
        }
      }
      return {
        id: log.id,
        action: log.action,
        description: log.description,
        targetName: log.targetName,
        targetId: log.targetId,
        createdAt: log.createdAt,
        user: log.user
          ? {
              ...log.user,
              name: [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email
            }
          : { name: 'مدير النظام', email: '', role: 'ADMIN', avatar: null },
        metadata: parsedMeta
      };
    });

    // Fallback baseline: if no logs exist yet in activityLog for this company,
    // synthesize baseline entries from existing companyApp table so the screen is useful immediately.
    if (logs.length === 0 && page === 1 && !search && (!action || action === 'ALL')) {
      const companyApps = await prisma.companyApp.findMany({
        where: { companyId },
        include: { app: true },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      if (companyApps.length > 0) {
        logs = companyApps.map((ca) => ({
          id: `synth-${ca.id}`,
          action: ca.status === 'CANCELLED' ? 'UNINSTALL_APP' : 'INSTALL_APP',
          description: ca.status === 'CANCELLED'
            ? `تم إلغاء تثبيت تطبيق "${ca.app?.name || 'تطبيق'}"`
            : `تم تثبيت وتفعيل تطبيق "${ca.app?.name || 'تطبيق'}"`,
          targetName: ca.app?.name || 'تطبيق',
          targetId: ca.appId,
          createdAt: ca.status === 'CANCELLED' ? ca.updatedAt : ca.createdAt,
          user: {
            id: null,
            name: 'مدير الحساب',
            email: '',
            role: 'OWNER',
            avatar: null
          },
          metadata: {
            appSlug: ca.app?.slug,
            status: ca.status,
            activePricingModel: ca.activePricingModel,
            synthetic: true
          }
        }));
      }
    }

    const calculatedTotal = total > 0 ? total : logs.length;
    const finalInstalls = installsCount || logs.filter((l) => l.action === 'INSTALL_APP').length;
    const finalUninstalls = uninstallsCount || logs.filter((l) => l.action === 'UNINSTALL_APP').length;

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: calculatedTotal,
          pages: Math.ceil(calculatedTotal / limit) || 1
        },
        stats: {
          totalInstalls: finalInstalls,
          totalUninstalls: finalUninstalls,
          totalActions: finalInstalls + finalUninstalls
        }
      }
    });
  } catch (error) {
    console.error('[marketplace] Error fetching marketplace logs:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل حركات التطبيقات'
    });
  }
};


