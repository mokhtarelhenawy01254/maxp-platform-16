
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const id = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  const variant = await prisma.productVariant.findUnique({
    where: { id }
  });

  if (variant) {
    console.log('Found ID as ProductVariant!');
  } else {
    console.log('ID not found as ProductVariant.');
  }
}

main().catch(console.error);
