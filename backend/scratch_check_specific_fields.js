
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const product = await prisma.product.findFirst({
    where: { name: 'بوت نسائي شتوي أنيق' }
  });
  
  if (product) {
    console.log('Main Image:', product.mainImage);
    console.log('Images:', product.images);
  } else {
    console.log('Product not found by name.');
  }
}

main().catch(console.error);
