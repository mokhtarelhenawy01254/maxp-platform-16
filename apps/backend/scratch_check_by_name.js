
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const product = await prisma.product.findFirst({
    where: { name: 'بوت نسائي شتوي أنيق' }
  });
  
  if (product) {
    console.log('Product Found:', JSON.stringify(product, null, 2));
  } else {
    console.log('Product not found by name.');
  }
}

main().catch(console.error);
