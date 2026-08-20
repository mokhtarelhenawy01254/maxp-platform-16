// Deactivates old marketplace apps that have been replaced/merged.
// Run after catalog:sync-target to clean up deprecated entries.
// Before deactivating a deprecated slug, any app whose requiredApps references
// it has that stale reference removed so dependent installs keep working
// (previously a stale reference hard-broke every dependent app).
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

const DEPRECATED_SLUGS = ['ecommerce-basic', 'store-basic', 'store-pro'];

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

async function removeStaleRequiredAppReferences(prisma, deprecatedSlug) {
  const dependentApps = await prisma.marketplaceApp.findMany({
    where: { NOT: { slug: deprecatedSlug } }
  });

  let cleaned = 0;
  for (const app of dependentApps) {
    const requiredApps = normalizeStringArray(app.requiredApps);
    if (!requiredApps.includes(deprecatedSlug)) {
      continue;
    }

    const updated = requiredApps.filter((slug) => slug !== deprecatedSlug);

    await prisma.marketplaceApp.update({
      where: { id: app.id },
      data: { requiredApps: updated, updatedAt: new Date() }
    });
    cleaned++;
  }

  return cleaned;
}

async function deactivateDeprecatedApps(options = {}) {
  const prisma = options.prisma || await getSharedPrismaClientAsync();
  const log = options.log || ((line) => console.log(line));
  const deprecatedSlugs = options.deprecatedSlugs || DEPRECATED_SLUGS;

  let deactivated = 0;
  let cleanedReferences = 0;

  for (const slug of deprecatedSlugs) {
    const app = await prisma.marketplaceApp.findUnique({ where: { slug } });
    if (!app) {
      log(`  [skip] ${slug} not in DB`);
      continue;
    }

    cleanedReferences += await removeStaleRequiredAppReferences(prisma, slug);

    if (app.isActive) {
      await prisma.marketplaceApp.update({ where: { slug }, data: { isActive: false } });
      log(`  [deactivated] ${slug}`);
      deactivated++;
    }
  }

  return { deactivated, cleanedReferences };
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const { deactivated, cleanedReferences } = await deactivateDeprecatedApps({ prisma });
  console.log(`Done. ${deactivated} deprecated app(s) deactivated, ${cleanedReferences} stale required-app reference(s) removed.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = {
  DEPRECATED_SLUGS,
  deactivateDeprecatedApps,
  normalizeStringArray,
  removeStaleRequiredAppReferences
};
