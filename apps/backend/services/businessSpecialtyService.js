const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const { marketplaceCatalogService } = require('./catalog/marketplaceCatalogService');

const DEFAULT_TRIAL_DAYS = 0;
const SETTINGS_SYSTEM_NAME = 'platform_onboarding';
const SETTINGS_DISPLAY_NAME = 'Platform onboarding settings';

const DEFAULT_SPECIALTIES = [
  {
    id: 'bizsp_ecommerce_retail',
    slug: 'ecommerce-retail',
    nameAr: 'التجارة والمتاجر',
    nameEn: 'E-commerce & Retail',
    descriptionAr: 'متجر إلكتروني، منتجات، طلبات، عروض، مشتريات وتحليلات.',
    descriptionEn: 'Online store, products, orders, offers, procurement, and analytics.',
    icon: 'ShoppingBag',
    sortOrder: 10,
    appSlugs: [
      'store-basic',
      'quantity-offers-pro',
      'commerce-advanced',
      'procurement-pro',
      'order-source-tracking',
      'crm-lite',
      'analytics-basic',
      'ai-chat-basic',
      'facebook-ads-pro',
      'conversion-suite',
      'ugc-reviews-pro',
    ],
  },
  {
    id: 'bizsp_marketing_sales',
    slug: 'marketing-sales',
    nameAr: 'التسويق والمبيعات',
    nameEn: 'Marketing & Sales',
    descriptionAr: 'حملات، إعلانات، تتبع تحويلات، مراجعات العملاء وإدارة علاقات العملاء.',
    descriptionEn: 'Campaigns, ads, conversion tracking, customer reviews, and CRM.',
    icon: 'Megaphone',
    sortOrder: 20,
    appSlugs: [
      'facebook-ads-pro',
      'conversion-suite',
      'ugc-reviews-pro',
      'affiliate-pro',
      'campaign-attribution',
      'analytics-basic',
      'crm-lite',
      'ai-chat-basic',
      'order-source-tracking',
    ],
  },
  {
    id: 'bizsp_operations_fulfillment',
    slug: 'operations-fulfillment',
    nameAr: 'العمليات والتشغيل',
    nameEn: 'Operations & Fulfillment',
    descriptionAr: 'تشغيل الطلبات، توزيع التأكيدات، مشتريات، تنبيهات وأتمتة.',
    descriptionEn: 'Order workflows, confirmation distribution, procurement, alerts, and automation.',
    icon: 'Workflow',
    sortOrder: 30,
    appSlugs: [
      'store-basic',
      'procurement-pro',
      'order-confirmation-distribution',
      'notification-automation',
      'order-source-tracking',
      'analytics-basic',
      'commerce-advanced',
    ],
  },
  {
    id: 'bizsp_customer_support',
    slug: 'customer-support',
    nameAr: 'خدمة العملاء والدعم',
    nameEn: 'Customer Support',
    descriptionAr: 'محادثات ذكية، CRM، إشعارات، تأكيد طلبات وتحليلات لخدمة العملاء.',
    descriptionEn: 'Smart chat, CRM, notifications, order confirmations, and support analytics.',
    icon: 'MessagesSquare',
    sortOrder: 40,
    appSlugs: [
      'ai-chat-basic',
      'crm-lite',
      'notification-automation',
      'order-confirmation-distribution',
      'analytics-basic',
      'store-basic',
    ],
  },
  {
    id: 'bizsp_affiliate_blog',
    slug: 'affiliate-blog-seo',
    nameAr: 'مدونات الأفليت والـ SEO',
    nameEn: 'Affiliate Blog & SEO',
    descriptionAr: 'مدونة أفليت احترافية: مقالات ومراجعات منتجات، كسب عمولات من أمازون، وأدوات SEO متكاملة. يفعّل ثيم Mens Grooming Pro تلقائيًا.',
    descriptionEn: 'Affiliate blog & SEO: product review articles, Amazon commissions, and full SEO tools. Auto-activates the Mens Grooming Pro theme.',
    icon: 'BookOpen',
    sortOrder: 15,
    themeId: 'mens-grooming-pro',
    appSlugs: [
      'blog-pro',
      'amazon-affiliate-pro',
      'analytics-basic',
      'campaign-attribution',
      'crm-lite',
    ],
  },
];

function getPrisma(prisma) {
  return prisma || getSharedPrismaClient();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeStringArray(parsed);
      }
    } catch (error) {
      // Use comma-separated fallback below.
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonConfig(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function parseTrialDays(value, fallback = DEFAULT_TRIAL_DAYS) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(365, Math.max(0, parsed));
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function serializeSpecialty(specialty) {
  if (!specialty) return null;
  return {
    id: specialty.id,
    slug: specialty.slug,
    nameAr: specialty.nameAr,
    nameEn: specialty.nameEn,
    descriptionAr: specialty.descriptionAr || '',
    descriptionEn: specialty.descriptionEn || '',
    icon: specialty.icon || 'Briefcase',
    appSlugs: normalizeStringArray(specialty.appSlugs),
    autoInstallOnSignup: specialty.autoInstallOnSignup !== false,
    themeId: specialty.themeId || null,
    sortOrder: Number.isFinite(Number(specialty.sortOrder)) ? Number(specialty.sortOrder) : 0,
    isActive: specialty.isActive !== false,
    companyCount: specialty._count?.companies || 0,
    createdAt: specialty.createdAt,
    updatedAt: specialty.updatedAt,
  };
}

async function ensureDefaultSpecialties(prismaArg) {
  const prisma = getPrisma(prismaArg);
  // Upsert-style seed: create missing defaults (skip existing by slug/id),
  // so new specialties (e.g. affiliate-blog-seo) appear on existing DBs too.
  await prisma.businessSpecialty.createMany({
    data: DEFAULT_SPECIALTIES.map((specialty) => ({
      ...specialty,
      autoInstallOnSignup: true,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

async function getOnboardingSettings(options = {}) {
  const prisma = getPrisma(options.prisma);

  return executeWithRetry(async () => {
    const setting = await prisma.systemSettings.upsert({
      where: { systemName: SETTINGS_SYSTEM_NAME },
      update: {
        displayName: SETTINGS_DISPLAY_NAME,
        category: 'platform',
      },
      create: {
        systemName: SETTINGS_SYSTEM_NAME,
        displayName: SETTINGS_DISPLAY_NAME,
        description: 'Trial duration and specialty-based onboarding configuration.',
        category: 'platform',
        isEnabled: true,
        config: JSON.stringify({ defaultTrialDays: DEFAULT_TRIAL_DAYS }),
      },
    });

    const config = parseJsonConfig(setting.config, {});
    return {
      defaultTrialDays: parseTrialDays(config.defaultTrialDays, DEFAULT_TRIAL_DAYS),
    };
  });
}

async function updateOnboardingSettings(payload = {}) {
  const defaultTrialDays = parseTrialDays(payload.defaultTrialDays, DEFAULT_TRIAL_DAYS);

  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    const setting = await prisma.systemSettings.upsert({
      where: { systemName: SETTINGS_SYSTEM_NAME },
      update: {
        displayName: SETTINGS_DISPLAY_NAME,
        description: 'Trial duration and specialty-based onboarding configuration.',
        category: 'platform',
        isEnabled: true,
        config: JSON.stringify({ defaultTrialDays }),
      },
      create: {
        systemName: SETTINGS_SYSTEM_NAME,
        displayName: SETTINGS_DISPLAY_NAME,
        description: 'Trial duration and specialty-based onboarding configuration.',
        category: 'platform',
        isEnabled: true,
        config: JSON.stringify({ defaultTrialDays }),
      },
    });

    const config = parseJsonConfig(setting.config, {});
    return {
      defaultTrialDays: parseTrialDays(config.defaultTrialDays, defaultTrialDays),
    };
  });
}

async function listPublicSpecialties() {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    await ensureDefaultSpecialties(prisma);

    const specialties = await prisma.businessSpecialty.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });

    return specialties.map(serializeSpecialty);
  });
}

async function listAdminSpecialties() {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    await ensureDefaultSpecialties(prisma);

    const specialties = await prisma.businessSpecialty.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });

    return specialties.map(serializeSpecialty);
  });
}

function buildSpecialtyPayload(payload = {}, existing = null) {
  const slug = normalizeSlug(payload.slug || existing?.slug || payload.nameEn || payload.nameAr);
  if (!slug) {
    const error = new Error('يجب تحديد رابط مختصر للتخصص');
    error.statusCode = 400;
    throw error;
  }

  const nameAr = String(payload.nameAr ?? existing?.nameAr ?? '').trim();
  const nameEn = String(payload.nameEn ?? existing?.nameEn ?? '').trim();
  if (!nameAr || !nameEn) {
    const error = new Error('اسم التخصص بالعربي والإنجليزي مطلوب');
    error.statusCode = 400;
    throw error;
  }

  return {
    slug,
    nameAr,
    nameEn,
    descriptionAr: String(payload.descriptionAr ?? existing?.descriptionAr ?? '').trim() || null,
    descriptionEn: String(payload.descriptionEn ?? existing?.descriptionEn ?? '').trim() || null,
    icon: String(payload.icon ?? existing?.icon ?? 'Briefcase').trim() || 'Briefcase',
    appSlugs: normalizeStringArray(payload.appSlugs ?? existing?.appSlugs),
    autoInstallOnSignup: payload.autoInstallOnSignup ?? existing?.autoInstallOnSignup ?? true,
    themeId: String(payload.themeId ?? existing?.themeId ?? '').trim() || null,
    sortOrder: Number.parseInt(String(payload.sortOrder ?? existing?.sortOrder ?? 0), 10) || 0,
    isActive: payload.isActive ?? existing?.isActive ?? true,
  };
}

async function createSpecialty(payload) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    const data = buildSpecialtyPayload(payload);
    const specialty = await prisma.businessSpecialty.create({ data });
    return serializeSpecialty(specialty);
  });
}

async function updateSpecialty(id, payload) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.businessSpecialty.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error('التخصص غير موجود');
      error.statusCode = 404;
      throw error;
    }

    const data = buildSpecialtyPayload(payload, existing);
    const specialty = await prisma.businessSpecialty.update({
      where: { id },
      data,
    });

    return serializeSpecialty(specialty);
  });
}

async function removeSpecialty(id) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.businessSpecialty.findUnique({
      where: { id },
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });

    if (!existing) {
      const error = new Error('التخصص غير موجود');
      error.statusCode = 404;
      throw error;
    }

    if ((existing._count?.companies || 0) > 0) {
      const specialty = await prisma.businessSpecialty.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: { companies: true },
          },
        },
      });
      return serializeSpecialty(specialty);
    }

    await prisma.businessSpecialty.delete({ where: { id } });
    return serializeSpecialty({ ...existing, isActive: false });
  });
}

async function resolveSpecialtyForRegistration(value) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    await ensureDefaultSpecialties(prisma);

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return null;

    const specialty = await prisma.businessSpecialty.findFirst({
      where: {
        isActive: true,
        OR: [{ id: normalizedValue }, { slug: normalizeSlug(normalizedValue) }],
      },
    });

    if (!specialty) {
      const error = new Error('التخصص المختار غير متاح');
      error.statusCode = 400;
      throw error;
    }

    return serializeSpecialty(specialty);
  });
}

async function getCompanySpecialtyAppSlugs(companyId) {
  if (!companyId) {
    return { applied: false, specialty: null, appSlugs: [] };
  }

  return executeWithRetry(async () => {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        businessSpecialty: true,
      },
    });

    const specialty = serializeSpecialty(company?.businessSpecialty);
    if (!specialty || !specialty.isActive) {
      return { applied: false, specialty: null, appSlugs: [] };
    }

    return {
      applied: true,
      specialty,
      appSlugs: specialty.appSlugs,
    };
  });
}

function buildDbAppPayloadFromCatalog(catalogApp) {
  const monthlyPrice = toSafeNumber(catalogApp?.monthlyPrice, 0);
  const yearlyPrice = toSafeNumber(catalogApp?.yearlyPrice, 0);
  const unitPriceRaw = catalogApp?.unitPrice;

  return {
    slug: String(catalogApp?.slug || '').trim(),
    name: String(catalogApp?.name || '').trim() || 'Untitled App',
    description: String(catalogApp?.description || '').trim(),
    logo: catalogApp?.logo || null,
    images: null,
    monthlyPrice,
    yearlyPrice,
    pricingModel: String(catalogApp?.pricingModel || (monthlyPrice === 0 ? 'FREE' : 'SUBSCRIPTION')).toUpperCase(),
    unitPrice: unitPriceRaw === null || unitPriceRaw === undefined ? null : toSafeNumber(unitPriceRaw, 0),
    unitName: catalogApp?.unitName || null,
    ppuBillingMethod: catalogApp?.ppuBillingMethod || "PER_ORDER",
    features: catalogApp?.features && typeof catalogApp.features === 'object' ? catalogApp.features : {},
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
    icon: catalogApp?.icon || null,
  };
}

async function ensureMarketplaceAppsBySlugs(slugs, options = {}) {
  const requestedSlugs = Array.from(new Set(normalizeStringArray(slugs)));
  if (requestedSlugs.length === 0) {
    return { apps: [], missingSlugs: [] };
  }

  const prisma = getPrisma(options.prisma);
  const existingApps = await prisma.marketplaceApp.findMany({
    where: {
      slug: { in: requestedSlugs },
      isActive: true,
      isPublic: true,
      category: { notIn: ['THEME', 'TEMPLATE'] },
    },
  });

  const appBySlug = new Map(existingApps.map((app) => [app.slug, app]));
  const missing = requestedSlugs.filter((slug) => !appBySlug.has(slug));

  if (missing.length > 0) {
    const snapshot = await marketplaceCatalogService.getSnapshot().catch(() => null);
    const catalogBySlug = new Map((snapshot?.apps || []).map((app) => [app.slug, app]));

    for (const slug of missing) {
      const catalogApp = catalogBySlug.get(slug);
      if (!catalogApp || catalogApp.isActive === false || catalogApp.isPublic === false) {
        continue;
      }

      const createPayload = buildDbAppPayloadFromCatalog(catalogApp);
      const app = await prisma.marketplaceApp.upsert({
        where: { slug },
        update: {
          name: createPayload.name,
          description: createPayload.description,
          logo: createPayload.logo,
          monthlyPrice: createPayload.monthlyPrice,
          yearlyPrice: createPayload.yearlyPrice,
          pricingModel: createPayload.pricingModel,
          unitPrice: createPayload.unitPrice,
          unitName: createPayload.unitName,
          ppuBillingMethod: createPayload.ppuBillingMethod,
          features: createPayload.features,
          isActive: createPayload.isActive,
          isPublic: createPayload.isPublic,
          isFeatured: createPayload.isFeatured,
          requiredApps: createPayload.requiredApps,
          trialDays: createPayload.trialDays,
          category: createPayload.category,
          isPopular: createPayload.isPopular,
          engineCompatibility: createPayload.engineCompatibility,
          icon: createPayload.icon,
          updatedAt: new Date(),
        },
        create: createPayload,
      });
      appBySlug.set(slug, app);
    }
  }

  const apps = requestedSlugs.map((slug) => appBySlug.get(slug)).filter(Boolean);
  return {
    apps,
    missingSlugs: requestedSlugs.filter((slug) => !appBySlug.has(slug)),
  };
}

async function getMarketplaceAppOptions() {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    const optionBySlug = new Map();

    const snapshot = await marketplaceCatalogService.getSnapshot().catch(() => null);
    (snapshot?.apps || []).forEach((app) => {
      if (app.isActive === false || app.isPublic === false) return;
      if (['THEME', 'TEMPLATE'].includes(String(app.category || '').toUpperCase())) return;
      optionBySlug.set(app.slug, {
        id: app.id,
        slug: app.slug,
        name: app.name,
        nameEn: app.nameEn || app.name,
        category: app.category,
        icon: app.icon || app.logo || null,
      });
    });

    const dbApps = await prisma.marketplaceApp.findMany({
      where: {
        isActive: true,
        isPublic: true,
        category: { notIn: ['THEME', 'TEMPLATE'] },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        icon: true,
        logo: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    dbApps.forEach((app) => {
      if (!optionBySlug.has(app.slug)) {
        optionBySlug.set(app.slug, {
          id: app.id,
          slug: app.slug,
          name: app.name,
          nameEn: app.name,
          category: app.category,
          icon: app.icon || app.logo || null,
        });
      }
    });

    return Array.from(optionBySlug.values()).sort((a, b) => {
      if (a.category !== b.category) return String(a.category).localeCompare(String(b.category));
      return String(a.name).localeCompare(String(b.name), 'ar');
    });
  });
}

module.exports = {
  DEFAULT_TRIAL_DAYS,
  DEFAULT_SPECIALTIES,
  SETTINGS_SYSTEM_NAME,
  normalizeStringArray,
  serializeSpecialty,
  ensureDefaultSpecialties,
  getOnboardingSettings,
  updateOnboardingSettings,
  listPublicSpecialties,
  listAdminSpecialties,
  createSpecialty,
  updateSpecialty,
  removeSpecialty,
  resolveSpecialtyForRegistration,
  getCompanySpecialtyAppSlugs,
  ensureMarketplaceAppsBySlugs,
  getMarketplaceAppOptions,
};
