#!/usr/bin/env node
/**
 * Update marketplace 'store' app:
 * - Renames to 'المتجر'
 * - Sets unitPrice = 1, unitName = 'طلب', ppuBillingMethod = 'PER_ORDER'
 * - Sets monthlyPrice = 699, yearlyPrice = 7689
 * - Ensures isActive = true, isPublic = true
 */
const { getSharedPrismaClientAsync, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    console.error('❌ Could not initialize Prisma client.');
    process.exit(1);
  }

  const app = await executeWithRetry(async () => {
    return await prisma.marketplaceApp.findUnique({
      where: { slug: 'store' }
    });
  });

  if (!app) {
    console.error("❌ App with slug 'store' not found in database.");
    process.exit(1);
  }

  const updated = await executeWithRetry(async () => {
    return await prisma.marketplaceApp.update({
      where: { slug: 'store' },
      data: {
        name: 'المتجر',
        monthlyPrice: 699,
        yearlyPrice: 7689,
        unitPrice: 1,
        unitName: 'طلب',
        ppuBillingMethod: 'PER_ORDER',
        pricingModel: 'PAY_PER_USE',
        isActive: true,
        isPublic: true,
        isFeatured: true,
        updatedAt: new Date()
      }
    });
  });

  console.log("✅ App 'store' updated successfully:");
  console.log(`   Name: ${updated.name}`);
  console.log(`   PPU: ${updated.unitPrice} EGP / ${updated.unitName} (${updated.ppuBillingMethod})`);
  console.log(`   Monthly: ${updated.monthlyPrice} EGP / mo`);
  console.log(`   Yearly: ${updated.yearlyPrice} EGP / yr`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error updating store app:', err);
  process.exit(1);
});
