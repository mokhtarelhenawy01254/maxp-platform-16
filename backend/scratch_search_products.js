
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const products = await prisma.product.findMany({
    where: {
        name: { contains: 'product', mode: 'insensitive' }
    }
  });

  console.log(`Found ${products.length} products matching "product":`);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name}`);
  });
}

main().catch(console.error);
