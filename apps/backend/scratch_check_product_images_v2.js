
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const productId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  // Use await directly since getSharedPrismaClient returns a proxy that waits for connection
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      productVariants: true,
      category: true
    }
  });

  console.log('Product Found:', !!product);
  if (product) {
    console.log('Name:', product.name);
    console.log('Images field (raw):', product.images);
    console.log('Main image field (raw):', product.mainImage);
    console.log('Variants count:', product.productVariants.length);
    product.productVariants.forEach(v => {
      console.log(`- Variant ${v.name}: image=${v.image}`);
    });
  }
}

main().catch(console.error).finally(() => {
    // Process might not exit due to intervals in sharedDatabase, but it's okay for a scratch script
});
