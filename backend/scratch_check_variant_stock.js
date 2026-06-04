const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  // Find variant by SKU
  const variant = await prisma.productVariant.findFirst({
    where: { sku: 'VAR-1775124479368-5' },
    include: { product: { select: { name: true, stock: true, trackInventory: true, isActive: true } } }
  });

  if (variant) {
    console.log('\n=== VARIANT FOUND ===');
    console.log('Variant ID:', variant.id);
    console.log('Variant Name:', variant.name);
    console.log('Variant SKU:', variant.sku);
    console.log('Variant Stock:', variant.stock, '(type:', typeof variant.stock, ')');
    console.log('Variant trackInventory:', variant.trackInventory);
    console.log('Variant isActive:', variant.isActive);
    console.log('Variant Price:', variant.price, '(type:', typeof variant.price, ')');
    console.log('\n--- Parent Product ---');
    console.log('Product Name:', variant.product.name);
    console.log('Product Stock:', variant.product.stock);
    console.log('Product trackInventory:', variant.product.trackInventory);
    console.log('Product isActive:', variant.product.isActive);

    // Also find ALL variants of this product
    const allVariants = await prisma.productVariant.findMany({
      where: { productId: variant.productId },
      select: { id: true, name: true, sku: true, stock: true, isActive: true, trackInventory: true, price: true }
    });
    
    console.log('\n=== ALL VARIANTS OF THIS PRODUCT ===');
    allVariants.forEach((v, i) => {
      console.log(`[${i}] SKU: ${v.sku} | Name: ${v.name} | Stock: ${v.stock} (${typeof v.stock}) | Active: ${v.isActive} | Track: ${v.trackInventory} | Price: ${v.price}`);
    });
  } else {
    console.log('Variant NOT found with SKU: VAR-1775124479368-5');
    
    // Try a broader search
    const variants = await prisma.productVariant.findMany({
      where: { sku: { contains: '1775124479368' } },
      select: { id: true, name: true, sku: true, stock: true, productId: true }
    });
    console.log('Broader search results:', variants);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
