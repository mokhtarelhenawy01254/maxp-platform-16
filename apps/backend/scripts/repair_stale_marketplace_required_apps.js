// Repairs stale requiredApps references across marketplace apps.
//
// Problem: several apps in the DB reference required apps that no longer exist
// as active/public apps (e.g. store-basic/store-pro/ecommerce-basic were merged
// into the single "store" app and deactivated), which hard-broke installation
// of every dependent app with "التطبيقات المطلوبة غير مثبتة".
//
// Policy:
//  - If the app is defined in the catalog, its requiredApps are aligned with the
//    catalog definition (the catalog is the source of truth).
//  - Otherwise (legacy DB-only apps), any required slug that does not resolve as
//    an active+public app in the DB or in the catalog is removed.
//
// Safe to run repeatedly (idempotent). Run after catalog:sync-target.
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { marketplaceCatalogService } = require('../services/catalog/marketplaceCatalogService');

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

function unique(values) {
  return [...new Set(values)];
}

async function repairStaleRequiredApps(options = {}) {
  const prisma = options.prisma || await getSharedPrismaClientAsync();
  const catalogService = options.catalogService || marketplaceCatalogService;
  const log = options.log || ((line) => console.log(line));
  const warn = options.warn || ((line) => console.warn(line));

  const snapshot = await catalogService.getSnapshot({ forceReload: true });
  const catalogApps = Array.isArray(snapshot.apps) ? snapshot.apps : [];

  const catalogBySlug = new Map(catalogApps.map((app) => [String(app.slug || '').trim(), app]));
  const dbApps = await prisma.marketplaceApp.findMany();

  const validDbSlugs = new Set(
    dbApps
      .filter((app) => app.isActive === true && app.isPublic === true)
      .map((app) => String(app.slug || '').trim())
  );

  let reviewed = 0;
  let updated = 0;
  const details = [];

  for (const app of dbApps) {
    const slug = String(app.slug || '').trim();
    if (!slug) continue;

    reviewed++;
    const current = normalizeStringArray(app.requiredApps);
    let next;

    const catalogApp = catalogBySlug.get(slug);
    if (catalogApp) {
      next = normalizeStringArray(catalogApp.requiredApps);
    } else {
      next = unique(
        current.filter((requiredSlug) => validDbSlugs.has(requiredSlug) || catalogBySlug.has(requiredSlug))
      );
    }

    if (JSON.stringify(next) !== JSON.stringify(current)) {
      await prisma.marketplaceApp.update({
        where: { id: app.id },
        data: { requiredApps: next, updatedAt: new Date() }
      });
      details.push({ slug, from: current, to: next });
      updated++;
    }
  }

  const summary = { reviewed, updated, details };
  log(`[repair:required-apps] reviewed=${reviewed} updated=${updated}`);
  for (const detail of details) {
    log(`  [fixed] ${detail.slug}: ${JSON.stringify(detail.from)} -> ${JSON.stringify(detail.to)}`);
  }

  return summary;
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const summary = await repairStaleRequiredApps({ prisma });
  if (summary.details.length === 0) {
    console.log('No stale required-app references found.');
  }
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  normalizeStringArray,
  repairStaleRequiredApps
};