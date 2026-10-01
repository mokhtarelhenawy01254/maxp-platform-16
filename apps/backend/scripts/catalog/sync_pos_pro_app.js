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

  // Seed test retail account for E2E verification
  try {
    const testUser = await prisma.user.findFirst({
      where: { email: 'retail.pos.test@maxp.online' },
      select: { id: true, companyId: true }
    });
    if (testUser && testUser.companyId) {
      const wallet = await prisma.companyWallet.upsert({
        where: { companyId: testUser.companyId },
        create: {
          id: `w-${testUser.companyId.slice(-8)}`,
          companyId: testUser.companyId,
          balance: 1000,
          currency: 'EGP'
        },
        update: {
          balance: { increment: 1000 }
        }
      });
      console.log(`💰 [test-seed] Wallet topped up for retail.pos.test: balance=${wallet.balance}`);

      const prodCount = await prisma.product.count({ where: { companyId: testUser.companyId } });
      if (prodCount === 0) {
        const prod = await prisma.product.create({
          data: {
            companyId: testUser.companyId,
            name: 'منتج تجريبي كاشير - شوكولاتة فاخرة',
            price: 50,
            costPrice: 30,
            sku: 'POS-TEST-001',
            barcode: '6221234567890',
            stock: 100,
            trackInventory: true,
            status: 'ACTIVE'
          }
        });
        console.log(`📦 [test-seed] Created sample product for retail.pos.test: id=${prod.id}, name=${prod.name}`);
      }
    }
  } catch (seedErr) {
    console.warn('[test-seed] Non-fatal seed warning:', seedErr.message);
  }

  await closeSharedDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ [sync:${SLUG}] Failed:`, err);
  process.exit(1);
});
