const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { getMarketplaceCatalogDbDiff } = require('../services/catalog/marketplaceCatalogDiffService');
const { marketplaceCatalogService } = require('../services/catalog/marketplaceCatalogService');
const { v4: uuidv4 } = require('uuid');
const { buildInstalledMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');

const ACTIVE_APP_STATUSES = ['ACTIVE', 'TRIAL'];
const VALID_PRICING_MODELS = new Set(['FREE', 'SUBSCRIPTION', 'PAY_PER_USE']);
const NON_RUNTIME_APP_CATEGORIES = ['THEME', 'TEMPLATE'];

function normalizePricingModel(value, fallback = 'SUBSCRIPTION') {
  const normalized = String(value || '').trim().toUpperCase();
  return VALID_PRICING_MODELS.has(normalized) ? normalized : fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function createRequiredAppsError(requiredApps) {
  const error = new Error('Required marketplace apps are missing');
  error.code = 'REQUIRED_APPS_MISSING';
  error.requiredApps = requiredApps;
  return error;
}

const MAX_RECURSION_DEPTH = 10;

async function ensureCompanyMarketplaceAppInstalled(tx, {
  companyId,
  app,
  pricingModel,
  visited = new Set(),
  autoInstalledApps = [],
  recordAutoInstall = false,
  depth = 0
}) {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(`Exceeded max auto-install recursion depth (${MAX_RECURSION_DEPTH}) for app: ${app?.slug}`);
  }
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
    const requiredApps = await tx.marketplaceApp.findMany({
      where: {
        slug: { in: requiredAppSlugs },
        isActive: true,
        isPublic: true
      }
    });

    const foundRequiredSlugs = new Set(requiredApps.map((requiredApp) => requiredApp.slug));
    const missingRequiredSlugs = requiredAppSlugs.filter(
      (requiredSlug) => !foundRequiredSlugs.has(requiredSlug)
    );

    if (missingRequiredSlugs.length > 0) {
      throw createRequiredAppsError(
        missingRequiredSlugs.map((requiredSlug) => ({
          slug: requiredSlug,
          name: requiredSlug
        }))
      );
    }

    for (const requiredApp of requiredApps) {
      await ensureCompanyMarketplaceAppInstalled(tx, {
        companyId,
        app: requiredApp,
        pricingModel: normalizePricingModel(requiredApp.pricingModel, 'SUBSCRIPTION'),
        visited,
        autoInstalledApps,
        recordAutoInstall: true,
        depth: depth + 1
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
  const validUntil = requestedPricingModel === 'SUBSCRIPTION'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const installedSettings = buildInstalledMarketplaceAppSettings(
    app.slug,
    existing?.settings,
    {
      general: {
        enabled: true
      }
    }
  );

  if (existing && ACTIVE_APP_STATUSES.includes(existing.status)) {
    return autoInstalledApps;
  }

  if (existing) {
    await tx.companyApp.update({
      where: { id: existing.id },
      data: {
        activePricingModel: requestedPricingModel,
        status: 'ACTIVE',
        validUntil,
        nextBillingAt: validUntil,
        settings: installedSettings,
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
        status: 'ACTIVE',
        validUntil,
        settings: installedSettings,
        nextBillingAt: validUntil
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

/**
 * @route GET /api/v1/super-admin/marketplace-management/apps
 * @desc Get all marketplace apps with stats
 * @access Super Admin
 */
exports.getAllApps = async (req, res) => {
  try {
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: {
          category: {
            notIn: ['THEME', 'TEMPLATE'],
          },
        },
        include: {
          _count: {
            select: {
              installations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    console.error('❌ Error fetching marketplace apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/catalog/diff
 * @desc Compare file catalog snapshot with DB snapshot
 * @access Super Admin
 */
exports.getCatalogDiff = async (req, res) => {
  try {
    const summary = await getMarketplaceCatalogDbDiff();
    const includeDetails = String(req.query.includeDetails || "true").toLowerCase() !== "false";

    if (includeDetails) {
      return res.json({
        success: true,
        data: summary
      });
    }

    return res.json({
      success: true,
      data: {
        comparedAt: summary.comparedAt,
        catalogMeta: summary.catalogMeta,
        totals: summary.totals
      }
    });
  } catch (error) {
    console.error("Error generating catalog diff:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate catalog diff",
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/coverage
 * @desc Return companies, active app installations, and DB app catalog for Marketplace coverage auditing
 * @access Super Admin
 */
exports.getCoverage = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const requestedLimit = Number.parseInt(String(req.query.limit || '200'), 10);
    const limit = Math.max(1, Math.min(500, Number.isFinite(requestedLimit) ? requestedLimit : 200));
    const companyWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const prisma = getSharedPrismaClient();
    const [companies, apps, totalCompanies] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.company.findMany({
          where: companyWhere,
          take: limit,
          orderBy: [
            { isActive: 'desc' },
            { name: 'asc' }
          ],
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,

            isActive: true,
            createdAt: true,
            installedApps: {
              where: {
                status: { in: ACTIVE_APP_STATUSES }
              },
              select: {
                id: true,
                status: true,
                activePricingModel: true,
                trialEndsAt: true,
                validUntil: true,
                app: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    icon: true,
                    category: true,
                    pricingModel: true
                  }
                }
              }
            }
          }
        }),
        prisma.marketplaceApp.findMany({
          where: {
            category: {
              notIn: NON_RUNTIME_APP_CATEGORIES
            }
          },
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
            category: true,
            isActive: true,
            isPublic: true,
            pricingModel: true,
            monthlyPrice: true,
            requiredApps: true
          },
          orderBy: { name: 'asc' }
        }),
        prisma.company.count({ where: companyWhere })
      ]);
    });

    const normalizedCompanies = companies.map((company) => {
      const activeApps = (company.installedApps || [])
        .filter((installation) => installation.app && installation.app.slug)
        .map((installation) => ({
          installationId: installation.id,
          status: installation.status,
          activePricingModel: installation.activePricingModel,
          trialEndsAt: installation.trialEndsAt,
          validUntil: installation.validUntil,
          app: installation.app
        }));

      return {
        id: company.id,
        name: company.name,
        email: company.email,
        slug: company.slug,
        isActive: company.isActive,
        createdAt: company.createdAt,
        activeApps,
        activeAppSlugs: activeApps.map((installation) => installation.app.slug)
      };
    });

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: {
          companies: totalCompanies,
          returnedCompanies: normalizedCompanies.length,
          marketplaceApps: apps.length
        },
        companies: normalizedCompanies,
        apps
      }
    });
  } catch (error) {
    console.error('Error generating marketplace coverage:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate marketplace coverage',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/coverage/companies/:companyId/apps/:slug/install
 * @desc Install or reactivate a marketplace app for a selected company
 * @access Super Admin
 */
exports.installCompanyCoverageApp = async (req, res) => {
  try {
    const { companyId, slug } = req.params;
    const { pricingModel } = req.body || {};
    const prisma = getSharedPrismaClient();

    const result = await executeWithRetry(async () => {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });

      if (!company) {
        const error = new Error('Company not found');
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }

      const app = await prisma.marketplaceApp.findUnique({
        where: { slug }
      });

      if (!app || !app.isActive || !app.isPublic || NON_RUNTIME_APP_CATEGORIES.includes(app.category)) {
        const error = new Error('Marketplace app is not installable');
        error.code = 'APP_NOT_INSTALLABLE';
        throw error;
      }

      return await prisma.$transaction(async (tx) => {
        const autoInstalledApps = [];
        await ensureCompanyMarketplaceAppInstalled(tx, {
          companyId,
          app,
          pricingModel,
          autoInstalledApps
        });

        const installation = await tx.companyApp.findUnique({
          where: {
            companyId_appId: { companyId, appId: app.id }
          },
          include: {
            app: {
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                category: true
              }
            }
          }
        });

        return {
          company,
          installation,
          autoInstalledApps
        };
      });
    });

    return res.json({
      success: true,
      message: 'Marketplace app activated for company',
      data: result
    });
  } catch (error) {
    if (error.code === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (error.code === 'APP_NOT_INSTALLABLE') {
      return res.status(404).json({
        success: false,
        message: 'Marketplace app is not installable'
      });
    }

    if (error.code === 'REQUIRED_APPS_MISSING') {
      return res.status(400).json({
        success: false,
        message: error.message,
        requiredApps: error.requiredApps
      });
    }

    console.error('Error installing coverage marketplace app:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate marketplace app for company',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/apps
 * @desc Create new marketplace app
 * @access Super Admin
 */
const generateSlug = (name) => {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base) return base;
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

exports.createApp = async (req, res) => {
  try {
    const body = req.body;

    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم التطبيق مطلوب'
      });
    }

    // Only pick fields that exist in the Prisma MarketplaceApp model
    const ALLOWED_FIELDS = [
      'slug', 'name', 'description', 'logo', 'images',
      'monthlyPrice', 'yearlyPrice', 'pricingModel', 'unitPrice', 'unitName',
      'ppuBillingMethod',
      'features', 'isActive', 'isPublic', 'isFeatured', 'isPopular',
      'requiredApps', 'trialDays', 'mainRoute', 'adminRoute',
      'category', 'icon', 'coverImage', 'engineCompatibility', 'isAutoInstall',
    ];
    const appData = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) appData[key] = body[key];
    }

    // Generate slug from name if not provided (fallback for non-latin names)
    if (!appData.slug) {
      appData.slug = generateSlug(appData.name);
    }

    // Ensure required non-null model fields have valid values
    if (appData.description == null) appData.description = String(body.name).trim() || '';
    if (appData.monthlyPrice == null) appData.monthlyPrice = 0;
    if (appData.yearlyPrice == null) appData.yearlyPrice = 0;

    // Ensure numeric fields are correctly typed
    if (appData.monthlyPrice != null) appData.monthlyPrice = parseFloat(appData.monthlyPrice);
    if (appData.yearlyPrice != null) appData.yearlyPrice = parseFloat(appData.yearlyPrice);
    if (appData.trialDays != null) appData.trialDays = parseInt(appData.trialDays);

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.create({
        data: appData
      });
    });

    try { marketplaceCatalogService?.clearCache?.(); } catch (_) {}

    res.json({
      success: true,
      message: 'تم إنشاء الأداة بنجاح',
      data: app
    });
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الأداة',
      error: error.message
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/apps/:id
 * @desc Update marketplace app
 * @access Super Admin
 */
exports.updateApp = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Only pick fields that exist in the Prisma MarketplaceApp model
    const ALLOWED_FIELDS = [
      'slug', 'name', 'description', 'logo', 'images',
      'monthlyPrice', 'yearlyPrice', 'pricingModel', 'unitPrice', 'unitName',
      'ppuBillingMethod',
      'features', 'isActive', 'isPublic', 'isFeatured', 'isPopular',
      'requiredApps', 'trialDays', 'mainRoute', 'adminRoute',
      'category', 'icon', 'coverImage', 'engineCompatibility', 'isAutoInstall',
    ];
    const updateData = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updateData[key] = body[key];
    }

    // Ensure numeric fields are correctly typed
    if (updateData.monthlyPrice != null) updateData.monthlyPrice = parseFloat(updateData.monthlyPrice);
    if (updateData.yearlyPrice != null) updateData.yearlyPrice = parseFloat(updateData.yearlyPrice);
    if (updateData.trialDays != null) updateData.trialDays = parseInt(updateData.trialDays);

    // Convert features array to JSON string if needed
    if (Array.isArray(updateData.features)) {
      updateData.features = updateData.features;
    }

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.update({
        where: { id },
        data: updateData
      });
    });

    // Auto-sync price and metadata changes back to file catalog (apps.json)
    let catalogSyncResult = null;
    try {
      if (typeof marketplaceCatalogService?.updateAppFile === 'function') {
        catalogSyncResult = await marketplaceCatalogService.updateAppFile(app.slug, updateData);
        if (catalogSyncResult?.success && catalogSyncResult?.modified) {
          console.log(`[catalog:auto-sync] Synchronized updates for app ${app.slug} to apps.json`);
        } else if (!catalogSyncResult?.success && catalogSyncResult?.reason !== 'app_not_in_catalog') {
          console.warn(`[catalog:auto-sync] ⚠️ Warning: Failed to sync app ${app.slug} to apps.json:`, catalogSyncResult?.error || catalogSyncResult?.reason);
        }
      }
      marketplaceCatalogService?.clearCache?.();
    } catch (catalogErr) {
      console.warn(`[catalog:auto-sync] ⚠️ Error syncing to catalog file:`, catalogErr.message);
    }

    res.json({
      success: true,
      message: 'تم تحديث الأداة بنجاح',
      data: app,
      catalogSynced: catalogSyncResult?.success ?? false,
      catalogWarning: (!catalogSyncResult?.success && catalogSyncResult?.reason !== 'app_not_in_catalog')
        ? 'تم التحديث في قاعدة البيانات ولكن تعذر تحديث ملف الكاتالوج تلقائياً — يرجى تشغيل npm run catalog:export-db'
        : undefined
    });
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الأداة',
      error: error.message
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/apps/:id
 * @desc Delete marketplace app
 * @access Super Admin
 */
exports.deleteApp = async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const app = await prisma.marketplaceApp.findUnique({
      where: { id },
      include: {
        _count: {
          select: { installations: true }
        }
      }
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    if (app._count.installations > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف الأداة: مثبتة لدى ${app._count.installations} شركة. قم بإلغاء التثبيت أولاً.`
      });
    }

    await executeWithRetry(async () => {
      return await prisma.marketplaceApp.delete({
        where: { id }
      });
    });

    try { marketplaceCatalogService?.clearCache?.(); } catch (_) {}

    res.json({
      success: true,
      message: 'تم حذف الأداة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الأداة'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/pricing-rules
 * @desc Get all pricing rules
 * @access Super Admin
 */
exports.getAllPricingRules = async (req, res) => {
  try {
    const rules = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.findMany({
        orderBy: { name: 'asc' }
      });
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('❌ Error fetching pricing rules:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قواعد التسعير',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/pricing-rules
 * @desc Create new pricing rule
 * @access Super Admin
 */
exports.createPricingRule = async (req, res) => {
  try {
    const ruleData = req.body;

    const rule = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.create({
        data: ruleData
      });
    });

    res.json({
      success: true,
      message: 'تم إنشاء قاعدة التسعير بنجاح',
      data: rule
    });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء قاعدة التسعير'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/pricing-rules/:id
 * @desc Update pricing rule
 * @access Super Admin
 */
exports.updatePricingRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.update({
        where: { id },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث قاعدة التسعير بنجاح',
      data: rule
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث قاعدة التسعير'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/pricing-rules/:id
 * @desc Delete pricing rule
 * @access Super Admin
 */
exports.deletePricingRule = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف قاعدة التسعير بنجاح'
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف قاعدة التسعير'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/bundles
 * @desc Get all bundles
 * @access Super Admin
 */
exports.getAllBundles = async (req, res) => {
  try {
    const bundles = await executeWithRetry(async () => {
      const allBundles = await getSharedPrismaClient().appBundle.findMany({
        orderBy: { createdAt: 'desc' }
      });

      // Fetch apps for each bundle based on appIds (supports both IDs and slugs)
      const bundlesWithApps = await Promise.all(
        allBundles.map(async (bundle) => {
          const appIds = Array.isArray(bundle.appIds) ? bundle.appIds : [];
          const apps = await getSharedPrismaClient().marketplaceApp.findMany({
            where: {
              OR: [
                { id: { in: appIds } },
                { slug: { in: appIds } }
              ]
            },
            select: {
              id: true,
              name: true,
              slug: true,
              monthlyPrice: true
            }
          });
          return { ...bundle, apps };
        })
      );

      return bundlesWithApps;
    });

    res.json({
      success: true,
      data: bundles
    });
  } catch (error) {
    console.error('❌ Error fetching bundles:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الباقات',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/bundles
 * @desc Create new bundle
 * @access Super Admin
 */
exports.createBundle = async (req, res) => {
  try {
    const bundleData = req.body;
    const { apps, ...rest } = bundleData;

    if (!rest.name || !String(rest.name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم الباقة مطلوب'
      });
    }

    const payload = {
      ...rest,
      ...(rest.slug ? {} : { slug: generateSlug(rest.name) }),
      description: rest.description == null ? String(rest.name).trim() : rest.description,
      monthlyPrice: rest.monthlyPrice != null ? parseFloat(rest.monthlyPrice) : 0,
      discount: rest.discount != null ? parseFloat(rest.discount) : 0,
      appIds: rest.appIds || (Array.isArray(apps)
        ? apps.map((app) => (typeof app === 'string' ? app : app.slug || app.id || '')).filter(Boolean)
        : [])
    };

    const bundle = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.create({
        data: payload
      });
    });

    res.json({
      success: true,
      message: 'تم إنشاء الباقة بنجاح',
      data: bundle
    });
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الباقة'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/bundles/:id
 * @desc Update bundle
 * @access Super Admin
 */
exports.updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const { apps, ...rest } = req.body;

    // Only set appIds when explicitly provided, otherwise preserve existing value
    const updateData = { ...rest };
    if (rest.appIds !== undefined || Array.isArray(apps)) {
      updateData.appIds = rest.appIds || (Array.isArray(apps)
        ? apps.map((app) => (typeof app === 'string' ? app : app.slug || app.id || '')).filter(Boolean)
        : []);
    }
    if (updateData.monthlyPrice != null) updateData.monthlyPrice = parseFloat(updateData.monthlyPrice);
    if (updateData.discount != null) updateData.discount = parseFloat(updateData.discount);

    const bundle = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.update({
        where: { id },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الباقة بنجاح',
      data: bundle
    });
  } catch (error) {
    console.error('Error updating bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الباقة'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/bundles/:id
 * @desc Delete bundle
 * @access Super Admin
 */
exports.deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف الباقة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الباقة'
    });
  }
};

module.exports = exports;
