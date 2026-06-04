
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const specificId = 'a73dd2b8-35d1-44c7-8703-fc42ecb29b09';
  
  const product = await prisma.product.findFirst({
    where: { id: specificId }
  });
  
  if (product) {
    console.log('Found product from test_prisma.js:', product.name);
  } else {
    console.log('Product from test_prisma.js NOT found.');
  }
}

main().catch(console.error);
