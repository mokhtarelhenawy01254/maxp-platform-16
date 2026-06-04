
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function checkThemes() {
  const prisma = await getSharedPrismaClientAsync();
  const themes = await prisma.marketplaceApp.findMany({
    where: { category: 'THEME' },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      isPublic: true,
      pricingModel: true,
      monthlyPrice: true
    }
  });
  console.log(JSON.stringify(themes, null, 2));
}

checkThemes().catch(console.error);
