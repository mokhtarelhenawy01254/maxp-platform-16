#!/usr/bin/env node

/**
 * remove_store_pro_app.js
 * 
 * Safely deletes the deprecated duplicate app 'store-pro' from the database
 * to ensure only a single unified 'store' app exists.
 */

const { getSharedPrismaClientAsync, closeSharedDatabase } = require('../../services/sharedDatabase');

const SLUG = 'store-pro';

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  const app = await prisma.marketplaceApp.findUnique({ where: { slug: SLUG } });

  if (!app) {
    console.log(`[delete:${SLUG}] App not found in database — already deleted.`);
    await closeSharedDatabase();
    return;
  }

  const installs = await prisma.companyApp.count({ where: { appId: app.id } });
  const reviews = await prisma.appReview.count({ where: { appId: app.id } });
  const pricingRules = await prisma.appPricingRule.count({ where: { appId: app.id } });

  console.log(`[delete:${SLUG}] Found duplicate app: ${app.name} (${app.slug})`);
  console.log(`  - company installs: ${installs}`);
  console.log(`  - reviews: ${reviews}`);
  console.log(`  - pricing rules: ${pricingRules}`);

  // Clean bundles referencing store-pro
  const bundles = await prisma.appBundle.findMany();
  let cleanedBundles = 0;
  for (const bundle of bundles) {
    const appIds = Array.isArray(bundle.appIds) ? bundle.appIds : [];
    if (appIds.includes(app.id) || appIds.includes(SLUG) || appIds.includes(`catalog:${SLUG}`)) {
      const nextIds = appIds.filter((id) => id !== app.id && id !== SLUG && id !== `catalog:${SLUG}`);
      await prisma.appBundle.update({
        where: { id: bundle.id },
        data: { appIds: nextIds },
      });
      cleanedBundles++;
    }
  }

  await prisma.appReview.deleteMany({ where: { appId: app.id } });
  await prisma.appPricingRule.deleteMany({ where: { appId: app.id } });
  await prisma.companyApp.deleteMany({ where: { appId: app.id } });
  await prisma.marketplaceApp.delete({ where: { slug: SLUG } });

  console.log(`✅ [delete:${SLUG}] Successfully removed store-pro from DB.`);
  console.log(`   Removed ${installs} installs, ${reviews} reviews, ${pricingRules} pricing rules, ${cleanedBundles} bundle refs.`);

  await closeSharedDatabase();
}

main().catch((err) => {
  console.error(`❌ [delete:${SLUG}] Error:`, err);
  process.exit(1);
});
