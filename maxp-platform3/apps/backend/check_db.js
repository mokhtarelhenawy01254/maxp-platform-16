const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = 'maxp';
  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, name: true, isActive: true, isHidden: true }
  });
  console.log(`Products for ${companyId}:`, JSON.stringify(products, null, 2));
  
  const categories = await prisma.category.findMany({
    where: { companyId },
    select: { id: true, name: true, isActive: true }
  });
  console.log(`Categories for ${companyId}:`, JSON.stringify(categories, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
