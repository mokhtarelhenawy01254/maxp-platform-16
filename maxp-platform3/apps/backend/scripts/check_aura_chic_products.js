const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  const company = await prisma.company.findUnique({
    where: { slug: 'aura-chic-test' }
  });

  if (!company) {
    console.log('Company not found');
    return;
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true, slug: true }
  });

  console.log('Products for aura-chic-test:');
  console.log(JSON.stringify(products, null, 2));
}

checkProducts()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
