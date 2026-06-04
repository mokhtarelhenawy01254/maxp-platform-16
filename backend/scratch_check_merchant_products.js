
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const merchantProducts = await prisma.merchantProduct.findMany();
  console.log(`Found ${merchantProducts.length} merchant products:`);
  merchantProducts.forEach(p => {
    console.log(`- [${p.id}]`);
  });
}

main().catch(console.error);
