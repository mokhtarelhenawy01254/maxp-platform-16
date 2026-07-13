const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    
    const product = await prisma.product.findFirst({
      where: { slug: 'pleated-chiffon-gown' },
      include: { productVariants: true }
    });

    if (!product) {
      console.log('Product NOT FOUND: pleated-chiffon-gown');
      return;
    }

    console.log(`Found Product: ${product.name} (ID: ${product.id})`);
    console.log('Variants count:', product.productVariants.length);
    console.log(JSON.stringify(product.productVariants, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
