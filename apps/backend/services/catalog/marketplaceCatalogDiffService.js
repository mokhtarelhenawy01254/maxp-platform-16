const { marketplaceCatalogService } = require("./marketplaceCatalogService");
const { getSharedPrismaClient } = require("../sharedDatabase");

const EXCLUDED_DB_APP_CATEGORIES = new Set(["THEME", "TEMPLATE"]);

const APP_COMPARE_FIELDS = [
  "name",
  "description",
  "category",
  "pricingModel",
  "monthlyPrice",
  "yearlyPrice",
  "unitPrice",
  "unitName",
  "ppuBillingMethod",
  "trialDays",
  "isActive",
  "isPublic",
  "isFeatured",
  "isPopular",
  "engineCompatibility",
  "requiredApps"
];

const BUNDLE_COMPARE_FIELDS = [
  "name",
  "description",
  "monthlyPrice",
  "yearlyPrice",
  "discount",
  "isActive",
  "isFeatured",
  "appSlugs"
];

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch (error) {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function normalizeNull(value) {
  return value === undefined ? null : value;
}

function sortUnique(values) {
  return Array.from(new Set(values)).sort();
}

function normalizePpuBillingMethod(app) {
  const isPpu = (app.pricingModel === "PAY_PER_USE" || (app.unitPrice !== null && app.unitPrice !== undefined && Number(app.unitPrice) > 0));
  if (!isPpu) return null;
  return app.ppuBillingMethod || "PER_ORDER";
}

function normalizeCatalogApp(app) {
  return {
    slug: app.slug,
    name: app.name,
    description: app.description || "",
    category: (app.category || "general").trim().toUpperCase(),
    pricingModel: app.pricingModel || "SUBSCRIPTION",
    monthlyPrice: toSafeNumber(app.monthlyPrice, 0),
    yearlyPrice: toSafeNumber(app.yearlyPrice, 0),
    unitPrice: app.unitPrice === null ? null : normalizeNull(toSafeNumber(app.unitPrice, 0)),
    unitName: app.unitName || null,
    ppuBillingMethod: normalizePpuBillingMethod(app),
    trialDays: Math.max(0, Math.floor(toSafeNumber(app.trialDays, 0))),
    isActive: app.isActive !== false,
    isPublic: app.isPublic !== false,
    isFeatured: app.isFeatured === true,
    isPopular: app.isPopular === true,
    engineCompatibility: app.engineCompatibility || null,
    requiredApps: sortUnique(normalizeStringArray(app.requiredApps))
  };
}

function normalizeDbApp(app) {
  return {
    slug: app.slug,
    name: app.name,
    description: app.description || "",
    category: (app.category || "general").trim().toUpperCase(),
    pricingModel: app.pricingModel || "SUBSCRIPTION",
    monthlyPrice: toSafeNumber(app.monthlyPrice, 0),
    yearlyPrice: toSafeNumber(app.yearlyPrice, 0),
    unitPrice: app.unitPrice === null ? null : normalizeNull(toSafeNumber(app.unitPrice, 0)),
    unitName: app.unitName || null,
    ppuBillingMethod: normalizePpuBillingMethod(app),
    trialDays: Math.max(0, Math.floor(toSafeNumber(app.trialDays, 0))),
    isActive: app.isActive !== false,
    isPublic: app.isPublic !== false,
    isFeatured: app.isFeatured === true,
    isPopular: app.isPopular === true,
    engineCompatibility: app.engineCompatibility || null,
    requiredApps: sortUnique(normalizeStringArray(app.requiredApps))
  };
}

function normalizeCatalogBundle(bundle) {
  return {
    slug: bundle.slug,
    name: bundle.name,
    description: bundle.description || "",
    monthlyPrice: toSafeNumber(bundle.monthlyPrice, 0),
    yearlyPrice: bundle.yearlyPrice === null || bundle.yearlyPrice === undefined
      ? null
      : toSafeNumber(bundle.yearlyPrice, 0),
    discount: toSafeNumber(bundle.discount, 0),
    isActive: bundle.isActive !== false,
    isFeatured: bundle.isFeatured === true,
    appSlugs: sortUnique(normalizeStringArray(bundle.appSlugs || (bundle.apps || []).map((app) => app.slug)))
  };
}

function normalizeDbBundle(bundle, appSlugById) {
  const tokens = normalizeStringArray(bundle.appIds);
  const appSlugs = sortUnique(tokens.map((token) => appSlugById.get(token) || token));

  return {
    slug: bundle.slug,
    name: bundle.name,
    description: bundle.description || "",
    monthlyPrice: toSafeNumber(bundle.monthlyPrice, 0),
    yearlyPrice: bundle.yearlyPrice === null || bundle.yearlyPrice === undefined
      ? null
      : toSafeNumber(bundle.yearlyPrice, 0),
    discount: toSafeNumber(bundle.discount, 0),
    isActive: bundle.isActive !== false,
    isFeatured: bundle.isFeatured === true,
    appSlugs
  };
}

function diffEntity(catalogEntry, dbEntry, fields) {
  const changes = [];
  fields.forEach((field) => {
    const left = catalogEntry[field];
    const right = dbEntry[field];
    const equal = Array.isArray(left) || Array.isArray(right)
      ? JSON.stringify(left || []) === JSON.stringify(right || [])
      : left === right;

    if (!equal) {
      changes.push({
        field,
        catalog: left,
        db: right
      });
    }
  });
  return changes;
}

function compareMaps(catalogMap, dbMap, fields) {
  const catalogSlugs = Array.from(catalogMap.keys()).sort();
  const dbSlugs = Array.from(dbMap.keys()).sort();

  const missingInDb = catalogSlugs.filter((slug) => !dbMap.has(slug));
  const extraInDb = dbSlugs.filter((slug) => !catalogMap.has(slug));
  const changed = [];

  catalogSlugs.forEach((slug) => {
    if (!dbMap.has(slug)) return;
    const entryDiff = diffEntity(catalogMap.get(slug), dbMap.get(slug), fields);
    if (entryDiff.length > 0) {
      changed.push({
        slug,
        changes: entryDiff
      });
    }
  });

  return {
    missingInDb,
    extraInDb,
    changed
  };
}

async function loadCatalogSnapshot(catalogService = marketplaceCatalogService) {
  if (typeof catalogService.getSnapshot === "function") {
    const snapshot = await catalogService.getSnapshot({ forceReload: true });
    const apps = new Map(
      (snapshot.apps || []).map((app) => [app.slug, normalizeCatalogApp(app)])
    );
    const bundles = new Map(
      (snapshot.bundles || []).map((bundle) => [bundle.slug, normalizeCatalogBundle(bundle)])
    );

    return {
      apps,
      bundles,
      meta: snapshot.meta || {}
    };
  }

  const [appsResult, bundlesResult] = await Promise.all([
    catalogService.getAllApps({
      onlyActive: false,
      onlyPublic: false,
      page: 1,
      limit: 10000
    }),
    catalogService.getAllBundles({
      onlyActive: false
    })
  ]);

  const apps = new Map(
    (appsResult.data || []).map((app) => [app.slug, normalizeCatalogApp(app)])
  );
  const bundles = new Map(
    (bundlesResult.data || []).map((bundle) => [bundle.slug, normalizeCatalogBundle(bundle)])
  );

  return {
    apps,
    bundles,
    meta: appsResult.meta || bundlesResult.meta || {}
  };
}

async function loadDbSnapshot(prisma = getSharedPrismaClient()) {
  if (!prisma || typeof prisma !== "object") {
    throw new Error("Database client is unavailable. Configure DATABASE_URL or POSTGRES_URL.");
  }

  const [dbApps, dbBundles] = await Promise.all([
    prisma.marketplaceApp.findMany({
      where: {
        category: {
          notIn: Array.from(EXCLUDED_DB_APP_CATEGORIES),
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pricingModel: true,
        monthlyPrice: true,
        yearlyPrice: true,
        unitPrice: true,
        unitName: true,
        ppuBillingMethod: true,
        trialDays: true,
        isActive: true,
        isPublic: true,
        isFeatured: true,
        isPopular: true,
        engineCompatibility: true,
        requiredApps: true
      }
    }),
    prisma.appBundle.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        appIds: true,
        monthlyPrice: true,
        yearlyPrice: true,
        discount: true,
        isActive: true,
        isFeatured: true
      }
    })
  ]);

  const appSlugById = new Map(dbApps.map((app) => [app.id, app.slug]));

  return {
    apps: new Map(dbApps.map((app) => [app.slug, normalizeDbApp(app)])),
    bundles: new Map(dbBundles.map((bundle) => [bundle.slug, normalizeDbBundle(bundle, appSlugById)]))
  };
}

async function getMarketplaceCatalogDbDiff(options = {}) {
  const catalogService = Object.prototype.hasOwnProperty.call(options, "catalogService")
    ? options.catalogService
    : marketplaceCatalogService;
  const prisma = Object.prototype.hasOwnProperty.call(options, "prisma")
    ? options.prisma
    : getSharedPrismaClient();

  const [catalogSnapshot, dbSnapshot] = await Promise.all([
    loadCatalogSnapshot(catalogService),
    loadDbSnapshot(prisma)
  ]);

  const appDiff = compareMaps(catalogSnapshot.apps, dbSnapshot.apps, APP_COMPARE_FIELDS);
  const bundleDiff = compareMaps(catalogSnapshot.bundles, dbSnapshot.bundles, BUNDLE_COMPARE_FIELDS);

  const totalDiffCount =
    appDiff.missingInDb.length +
    appDiff.extraInDb.length +
    appDiff.changed.length +
    bundleDiff.missingInDb.length +
    bundleDiff.extraInDb.length +
    bundleDiff.changed.length;

  return {
    comparedAt: new Date().toISOString(),
    catalogMeta: catalogSnapshot.meta,
    totals: {
      catalogApps: catalogSnapshot.apps.size,
      dbApps: dbSnapshot.apps.size,
      catalogBundles: catalogSnapshot.bundles.size,
      dbBundles: dbSnapshot.bundles.size,
      diffEntries: totalDiffCount
    },
    apps: appDiff,
    bundles: bundleDiff
  };
}

module.exports = {
  getMarketplaceCatalogDbDiff
};
