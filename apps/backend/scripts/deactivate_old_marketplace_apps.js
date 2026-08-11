// Deactivates old marketplace apps that have been replaced/merged.
// Run after catalog:sync-target to clean up deprecated entries.
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

// Deactivated 2026-08: standalone calculators are free marketing tools, not sellable apps.
const DEPRECATED_SLUGS = [
  'ecommerce-basic', 'store-basic', 'store-pro',
  'product-presentations',
  'break-even', 'product-break-even', 'pricing-strategy',
  'profitability-engine', 'campaign-calculator', 'ad-budget-planner',
  'discount-impact', 'shipping-optimizer', 'monthly-pnl',
  'clv-calculator', 'upsell-planner', 'refund-rate',
];

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  let deactivated = 0;

  for (const slug of DEPRECATED_SLUGS) {
    const app = await prisma.marketplaceApp.findUnique({ where: { slug } });
    if (app && app.isActive) {
      await prisma.marketplaceApp.update({ where: { slug }, data: { isActive: false } });
      console.log(`  [deactivated] ${slug}`);
      deactivated++;
    }
  }

  console.log(`Done. ${deactivated} deprecated app(s) deactivated.`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
