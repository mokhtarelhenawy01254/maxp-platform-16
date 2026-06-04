
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const id = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  const product = await prisma.product.findFirst({
    where: {
        OR: [
            { id },
            { slug: id },
            { easyOrdersId: id },
            { externalId: id },
            { wooCommerceId: id }
        ]
    }
  });

  if (product) {
    console.log('Found product by alternative ID:', product.name);
  } else {
    console.log('Product NOT found by ANY alternative ID.');
  }
}

main().catch(console.error);
