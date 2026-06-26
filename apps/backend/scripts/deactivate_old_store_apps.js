const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const slugs = ['ecommerce-basic', 'store-basic', 'store-pro'];

  for (const s of slugs) {
    const app = await prisma.marketplaceApp.findUnique({ where: { slug: s } });
    if (app) {
      console.log(s, '- found, isActive:', app.isActive);
      await prisma.marketplaceApp.update({ where: { slug: s }, data: { isActive: false } });
      console.log('  => deactivated');
    } else {
      console.log(s, '- not found');
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
