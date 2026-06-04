
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const products = await prisma.product.findMany({
      select: { id: true, name: true }
  });
  
  console.log(`Listing ALL ${products.length} products:`);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name}`);
  });
}

main().catch(console.error);
