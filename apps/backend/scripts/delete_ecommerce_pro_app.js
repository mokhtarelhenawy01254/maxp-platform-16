// Hard-deletes the ecommerce-pro marketplace app and all related records.
// Run once against the target DB after deploying the code that removed
// ecommerce-pro from the marketplace seed and gating references.
//
//   node scripts/delete_ecommerce_pro_app.js
//
// Deletes (in order):
//   - company_apps rows referencing ecommerce-pro (cascade to usage logs)
//   - app_reviews / app_pricing_rules for the app
//   - the marketplace_apps row itself
//   - ecommerce-pro id from any app_bundles.appIds array
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

const SLUG = 'ecommerce-pro';

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  const app = await prisma.marketplaceApp.findUnique({ where: { slug: SLUG } });

  if (!app) {
    console.log(`[delete:${SLUG}] App not found — nothing to delete.`);
    await prisma.$disconnect();
    return;
  }

  const installs = await prisma.companyApp.count({ where: { appId: app.id } });
  const reviews = await prisma.appReview.count({ where: { appId: app.id } });
  const pricingRules = await prisma.appPricingRule.count({ where: { appId: app.id } });

  console.log(`[delete:${SLUG}] Found app: ${app.name}`);
  console.log(`  - company installs: ${installs}`);
  console.log(`  - reviews: ${reviews}`);
  console.log(`  - pricing rules: ${pricingRules}`);

  // Bundles may reference the app id in their appIds JSON array.
  const bundles = await prisma.appBundle.findMany();
  let cleanedBundles = 0;
  for (const bundle of bundles) {
    const appIds = Array.isArray(bundle.appIds) ? bundle.appIds : [];
    if (appIds.includes(app.id)) {
      const nextIds = appIds.filter((id) => id !== app.id);
      await prisma.appBundle.update({
        where: { id: bundle.id },
        data: { appIds: nextIds },
      });
      console.log(`  - cleaned bundle "${bundle.slug}" (removed ecommerce-pro id)`);
      cleanedBundles++;
    }
  }

  // Explicit child deletes first (defensive, in case FK cascade is absent).
  await prisma.appReview.deleteMany({ where: { appId: app.id } });
  await prisma.appPricingRule.deleteMany({ where: { appId: app.id } });
  await prisma.companyApp.deleteMany({ where: { appId: app.id } });
  await prisma.marketplaceApp.delete({ where: { slug: SLUG } });

  console.log(`[delete:${SLUG}] Done. Removed app, ${installs} install(s), ${reviews} review(s), ${pricingRules} pricing rule(s), ${cleanedBundles} bundle reference(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(`[delete:${SLUG}] Failed:`, err);
  process.exit(1);
});
