#!/usr/bin/env node

/**
 * sync_pos_pro_app.js
 * 
 * Ensures the POS app (pos-pro) is activated as a standalone public app
 * with mainRoute and adminRoute configured to /pos and requiredApps cleared.
 */

const { getSharedPrismaClientAsync, closeSharedDatabase } = require('../../services/sharedDatabase');

const SLUG = 'pos-pro';

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  const app = await prisma.marketplaceApp.findUnique({ where: { slug: SLUG } });

  if (!app) {
    console.log(`[sync:${SLUG}] App not found in database — will be created by catalog:sync-target.`);
    await closeSharedDatabase();
    return;
  }

  console.log(`[sync:${SLUG}] Current state: isActive=${app.isActive}, isPublic=${app.isPublic}, mainRoute=${app.mainRoute}, requiredApps=${JSON.stringify(app.requiredApps)}`);

  const updated = await prisma.marketplaceApp.update({
    where: { slug: SLUG },
    data: {
      isActive: true,
      isPublic: true,
      mainRoute: '/pos',
      adminRoute: '/pos',
      requiredApps: [],
      category: 'ECOMMERCE',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      icon: 'monitor',
    },
  });

  console.log(`✅ [sync:${SLUG}] Updated successfully: isActive=${updated.isActive}, isPublic=${updated.isPublic}, mainRoute=${updated.mainRoute}, adminRoute=${updated.adminRoute}, requiredApps=${JSON.stringify(updated.requiredApps)}`);

  await closeSharedDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ [sync:${SLUG}] Failed:`, err);
  process.exit(1);
});
