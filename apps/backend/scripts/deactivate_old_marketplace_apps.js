// Deactivates old marketplace apps that have been replaced/merged.
// Run after catalog:sync-target to clean up deprecated entries.
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

const DEPRECATED_SLUGS = ['ecommerce-basic', 'store-basic', 'store-pro'];

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

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
