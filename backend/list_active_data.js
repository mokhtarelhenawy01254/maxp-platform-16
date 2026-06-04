const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    take: 10,
    select: { id: true, name: true, slug: true }
  });

  console.log('--- Active Companies ---');
  for (const company of companies) {
    const products = await prisma.product.findMany({
      where: { companyId: company.id, isActive: true },
      take: 1,
      select: { id: true, name: true, slug: true, price: true }
    });
    
    console.log(`Company: ${company.name} | Slug: ${company.slug} | Sync Products: ${products.length}`);
    if (products.length > 0) {
      console.log(`  -> Product: ${products[0].name} (Slug: ${products[0].slug}, ID: ${products[0].id}, Price: ${products[0].price})`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
