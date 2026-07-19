#!/usr/bin/env node

const { marketplaceCatalogService } = require("../services/catalog/marketplaceCatalogService");
const {
  getSharedPrismaClient,
  executeWithRetry,
  closeSharedDatabase
} = require("../services/sharedDatabase");

const VALID_PRICING_MODELS = new Set(["FREE", "SUBSCRIPTION", "PAY_PER_USE"]);

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSlug(value) {
  return String(value || "").trim();
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

function normalizeJsonObject(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      return fallback;
    }
  }

  return fallback;
}

function normalizePricingModel(value, fallback = "SUBSCRIPTION") {
  const normalized = String(value || "").trim().toUpperCase();
  if (VALID_PRICING_MODELS.has(normalized)) {
    return normalized;
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
    slug: normalizeSlug(catalogApp?.slug),
    name: String(catalogApp?.name || "").trim() || "Untitled App",
    description: String(catalogApp?.description || "").trim(),
    logo: catalogApp?.logo || catalogApp?.coverImage || null,
    images: catalogApp?.coverImage ? [catalogApp.coverImage] : null,
    monthlyPrice,
    yearlyPrice,
    pricingModel: normalizePricingModel(
      catalogApp?.pricingModel,
      monthlyPrice === 0 ? "FREE" : "SUBSCRIPTION"
    ),
    unitPrice,
    unitName: catalogApp?.unitName || null,
    features: normalizeJsonObject(catalogApp?.features, {}),
    isActive: catalogApp?.isActive !== false,
    isPublic: catalogApp?.isPublic !== false,
    isFeatured: catalogApp?.isFeatured === true,
    requiredApps: normalizeStringArray(catalogApp?.requiredApps),
    trialDays: Math.max(0, Math.floor(toSafeNumber(catalogApp?.trialDays, 0))),
    mainRoute: null,
    adminRoute: null,
    category: String(catalogApp?.category || "general").trim() || "general",
    rating: toSafeNumber(catalogApp?.rating, 0),
    reviewCount: Math.max(0, Math.floor(toSafeNumber(catalogApp?.reviewCount, 0))),
    installCount: Math.max(0, Math.floor(toSafeNumber(catalogApp?.installCount, 0))),
    isPopular: catalogApp?.isPopular === true,
    engineCompatibility: catalogApp?.engineCompatibility || null,
    icon: catalogApp?.icon || null
  };
}

function getBundleAppSlugs(catalogBundle) {
  return normalizeStringArray(
    catalogBundle?.appSlugs ||
    (Array.isArray(catalogBundle?.apps)
      ? catalogBundle.apps.map((app) => app?.slug || app?.id)
      : catalogBundle?.appIds)
  );
}

function resolveBundleAppIds(catalogBundle, appIdBySlug, plannedAppSlugs = new Set()) {
  const appSlugs = getBundleAppSlugs(catalogBundle);
  const appIds = [];
  const missingAppSlugs = [];

  appSlugs.forEach((slug) => {
    const appId = appIdBySlug.get(slug);
    if (appId) {
      appIds.push(appId);
      return;
    }

    if (plannedAppSlugs.has(slug)) {
      appIds.push(`catalog:${slug}`);
      return;
    }

    missingAppSlugs.push(slug);
  });

  return { appSlugs, appIds, missingAppSlugs };
}

function buildDbBundlePayloadFromCatalog(catalogBundle, appIds) {
  const yearlyPriceRaw = catalogBundle?.yearlyPrice;

  return {
    slug: normalizeSlug(catalogBundle?.slug),
    name: String(catalogBundle?.name || "").trim() || "Untitled Bundle",
    nameEn: catalogBundle?.nameEn || null,
    description: String(catalogBundle?.description || "").trim(),
    appIds,
    monthlyPrice: toSafeNumber(catalogBundle?.monthlyPrice, 0),
    yearlyPrice: yearlyPriceRaw === null || yearlyPriceRaw === undefined
      ? null
      : toSafeNumber(yearlyPriceRaw, 0),
    discount: toSafeNumber(catalogBundle?.discount, 0),
    isActive: catalogBundle?.isActive !== false,
    isFeatured: catalogBundle?.isFeatured === true
  };
}

async function loadCatalogEntries(catalogService = marketplaceCatalogService) {
  if (typeof catalogService.getSnapshot === "function") {
    const snapshot = await catalogService.getSnapshot({ forceReload: true });
    return {
      apps: Array.isArray(snapshot.apps) ? snapshot.apps : [],
      bundles: Array.isArray(snapshot.bundles) ? snapshot.bundles : [],
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

  return {
    apps: Array.isArray(appsResult?.data) ? appsResult.data : [],
    bundles: Array.isArray(bundlesResult?.data) ? bundlesResult.data : [],
    meta: appsResult?.meta || bundlesResult?.meta || {}
  };
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    failOnMissing: false,
    json: false,
    syncApps: true,
    syncBundles: true,
    help: false
  };

  argv.forEach((token) => {
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--fail-on-missing") args.failOnMissing = true;
    else if (token === "--json") args.json = true;
    else if (token === "--apps-only") args.syncBundles = false;
    else if (token === "--bundles-only") args.syncApps = false;
    else if (token === "--only-missing") {
      // Safe default: existing DB rows are never overwritten by this script.
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  });

  return args;
}

function printHelp() {
  console.log("Usage: node scripts/sync_target_marketplace_catalog_entries.js [--dry-run] [--fail-on-missing] [--json] [--apps-only|--bundles-only] [--only-missing]");
  console.log("");
  console.log("Options:");
  console.log("  --dry-run          Show what would be created without writing to DB");
  console.log("  --fail-on-missing  Exit with code 1 when any catalog entry remains unresolved");
  console.log("  --json             Output machine-readable JSON");
  console.log("  --apps-only        Sync missing apps only");
  console.log("  --bundles-only     Sync missing bundles only");
  console.log("  --only-missing     Explicitly keep the default safe mode");
}

function printSummary(summary) {
  const mode = summary.dryRun ? "dry-run" : "write";

  console.log(`[catalog:sync-target] Marketplace catalog DB sync (${mode})`);
  console.log(`- catalog version: ${summary.catalogMeta.catalogVersion || "unknown"}`);
  console.log(`- apps: catalog=${summary.apps.catalog}, existing=${summary.apps.existing.length}, created=${summary.apps.created.length}, planned=${summary.apps.planned.length}, invalid=${summary.apps.invalid.length}`);
  console.log(`- bundles: catalog=${summary.bundles.catalog}, existing=${summary.bundles.existing.length}, created=${summary.bundles.created.length}, planned=${summary.bundles.planned.length}, skipped=${summary.bundles.skippedMissingApps.length}`);

  const createdApps = summary.dryRun ? summary.apps.planned : summary.apps.created;
  const createdBundles = summary.dryRun ? summary.bundles.planned : summary.bundles.created;

  if (createdApps.length > 0) {
    console.log(`- ${summary.dryRun ? "apps to create" : "created apps"}: ${createdApps.join(", ")}`);
  }

  if (createdBundles.length > 0) {
    console.log(`- ${summary.dryRun ? "bundles to create" : "created bundles"}: ${createdBundles.join(", ")}`);
  }

  summary.bundles.skippedMissingApps.forEach((entry) => {
    console.log(`- skipped bundle ${entry.slug}: missing app refs ${entry.missingAppSlugs.join(", ")}`);
  });
}

function getUnresolvedMissingEntries(summary) {
  const unresolved = [];

  summary.apps.planned.forEach((slug) => {
    unresolved.push({
      type: "app",
      slug,
      reason: summary.dryRun ? "dry_run_planned_create" : "missing_after_sync"
    });
  });

  summary.apps.invalid.forEach((entry) => {
    unresolved.push({
      type: "app",
      slug: entry.name || "",
      reason: entry.reason || "invalid_catalog_app"
    });
  });

  summary.bundles.planned.forEach((slug) => {
    unresolved.push({
      type: "bundle",
      slug,
      reason: summary.dryRun ? "dry_run_planned_create" : "missing_after_sync"
    });
  });

  summary.bundles.skippedMissingApps.forEach((entry) => {
    unresolved.push({
      type: "bundle",
      slug: entry.slug,
      reason: "missing_app_refs",
      missingAppSlugs: entry.missingAppSlugs
    });
  });

  return unresolved;
}

function hasUnresolvedMissingEntries(summary) {
  return getUnresolvedMissingEntries(summary).length > 0;
}

async function runDbOperation(operation, executeDbOperation) {
  return executeDbOperation(operation);
}

async function syncMissingMarketplaceCatalogEntries(options = {}) {
  const catalogService = options.catalogService || marketplaceCatalogService;
  const prisma = options.prisma || getSharedPrismaClient();
  const executeDbOperation = options.executeDbOperation || executeWithRetry;
  const dryRun = options.dryRun === true;
  const syncApps = options.syncApps !== false;
  const syncBundles = options.syncBundles !== false;

  if (!prisma || typeof prisma !== "object") {
    throw new Error("Database client is unavailable. Configure DATABASE_URL or POSTGRES_URL.");
  }

  const catalog = await loadCatalogEntries(catalogService);
  const summary = {
    dryRun,
    catalogMeta: catalog.meta || {},
    apps: {
      catalog: catalog.apps.length,
      existing: [],
      created: [],
      planned: [],
      invalid: []
    },
    bundles: {
      catalog: catalog.bundles.length,
      existing: [],
      created: [],
      planned: [],
      skippedMissingApps: []
    }
  };

  const [dbApps, dbBundles] = await Promise.all([
    runDbOperation(
      () => prisma.marketplaceApp.findMany({
        select: { id: true, slug: true }
      }),
      executeDbOperation
    ),
    runDbOperation(
      () => prisma.appBundle.findMany({
        select: { id: true, slug: true }
      }),
      executeDbOperation
    )
  ]);

  const appIdBySlug = new Map((dbApps || []).map((app) => [app.slug, app.id]));
  const existingBundleSlugs = new Set((dbBundles || []).map((bundle) => bundle.slug));
  const plannedAppSlugs = new Set();

  if (syncApps) {
    for (const catalogApp of catalog.apps) {
      const slug = normalizeSlug(catalogApp?.slug);
      if (!slug) {
        summary.apps.invalid.push({ reason: "missing_slug", name: catalogApp?.name || null });
        continue;
      }

      if (appIdBySlug.has(slug)) {
        summary.apps.existing.push(slug);
        continue;
      }

      plannedAppSlugs.add(slug);

      if (dryRun) {
        summary.apps.planned.push(slug);
        continue;
      }

      const payload = buildDbAppPayloadFromCatalog(catalogApp);
      const createdApp = await runDbOperation(
        () => prisma.marketplaceApp.create({ data: payload }),
        executeDbOperation
      );

      appIdBySlug.set(createdApp.slug, createdApp.id);
      summary.apps.created.push(createdApp.slug);
    }
  }

  if (syncBundles) {
    for (const catalogBundle of catalog.bundles) {
      const slug = normalizeSlug(catalogBundle?.slug);
      if (!slug) {
        summary.bundles.skippedMissingApps.push({
          slug: "",
          missingAppSlugs: ["missing_bundle_slug"]
        });
        continue;
      }

      if (existingBundleSlugs.has(slug)) {
        summary.bundles.existing.push(slug);
        continue;
      }

      const bundleResolution = resolveBundleAppIds(
        catalogBundle,
        appIdBySlug,
        dryRun ? plannedAppSlugs : new Set()
      );

      if (bundleResolution.missingAppSlugs.length > 0) {
        summary.bundles.skippedMissingApps.push({
          slug,
          missingAppSlugs: bundleResolution.missingAppSlugs
        });
        continue;
      }

      if (dryRun) {
        summary.bundles.planned.push(slug);
        continue;
      }

      const payload = buildDbBundlePayloadFromCatalog(catalogBundle, bundleResolution.appIds);
      const createdBundle = await runDbOperation(
        () => prisma.appBundle.create({ data: payload }),
        executeDbOperation
      );

      existingBundleSlugs.add(createdBundle.slug);
      summary.bundles.created.push(createdBundle.slug);
    }
  }

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const summary = await syncMissingMarketplaceCatalogEntries(args);
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(summary);
  }

  if (args.failOnMissing && hasUnresolvedMissingEntries(summary)) {
    const unresolved = getUnresolvedMissingEntries(summary);
    console.error(`[catalog:sync-target] Unresolved missing catalog entries: ${JSON.stringify(unresolved)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[catalog:sync-target] Failed:", error.message);
      process.exitCode = 2;
    })
    .finally(async () => {
      await closeSharedDatabase().catch(() => {});
    });
}

module.exports = {
  buildDbAppPayloadFromCatalog,
  buildDbBundlePayloadFromCatalog,
  getBundleAppSlugs,
  getUnresolvedMissingEntries,
  hasUnresolvedMissingEntries,
  loadCatalogEntries,
  normalizeStringArray,
  parseArgs,
  resolveBundleAppIds,
  syncMissingMarketplaceCatalogEntries
};
