
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const specificId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  const product = await prisma.product.findFirst({
    where: { id: specificId }
  });

  if (product) {
    console.log('Found product globally:', product.name);
    console.log('Is Active:', product.isActive);
    console.log('Deleted At:', product.deletedAt);
  } else {
    console.log('Product NOT found globally.');
  }
}

main().catch(console.error);
