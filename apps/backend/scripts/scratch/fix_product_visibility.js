const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const productId = 'cmmr0dugh0004vpk440j1n6ui';
    
    console.log(`Checking product ${productId}...`);
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      console.error('Product not found');
      return;
    }

    console.log('Current state:', {
      isActive: product.isActive,
      isHidden: product.isHidden,
      stock: product.stock,
      companyId: product.companyId
    });

    if (product.isHidden || !product.isActive || product.stock <= 0) {
      console.log('Updating product to be visible and in stock...');
      await prisma.product.update({
        where: { id: productId },
        data: {
          isActive: true,
          isHidden: false,
          stock: 99
        }
      });
      console.log('Product updated successfully.');
    } else {
      console.log('Product is already visible and in stock.');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    process.exit(0);
  }
}

main();
