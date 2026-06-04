
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const companyId = 'cmmj76klv0000vbwsws4qrybs';
  const products = await prisma.product.findMany({
    where: { companyId },
    include: { category: true }
  });

  console.log(`Products for company m22 (${products.length}):`);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name} (Category: ${p.category?.name})`);
    console.log(`  MainImage: ${p.mainImage}`);
    console.log(`  Images: ${p.images}`);
  });
}

main().catch(console.error);
