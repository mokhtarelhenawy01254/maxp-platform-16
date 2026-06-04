
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  console.log('Searching for any products...');
  const products = await prisma.product.findMany({
    take: 5,
    include: {
      category: true
    }
  });

  console.log('Total products found:', products.length);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name} (Company: ${p.companyId})`);
  });

  const specificId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  const product = await prisma.product.findFirst({
    where: { id: specificId }
  });
  console.log(`Specific product [${specificId}] found:`, !!product);
}

main().catch(console.error);
