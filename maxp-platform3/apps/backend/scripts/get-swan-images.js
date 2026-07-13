const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { slug: 'swan' },
        { id: 'swan' }
      ]
    }
  });

  if (!company) {
    console.error('Company Swan not found!');
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      title: true,
      slug: true,
      mainImage: true,
      images: true
    }
  });

  console.log('PRODUCTS_FOUND:');
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
