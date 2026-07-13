const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const companySlug = 'aura-chic-test';

  console.log('🌱 Re-Seeding Aura Chic Variants with standard separator...');

  const company = await prisma.company.findUnique({
    where: { slug: companySlug }
  });

  if (!company) {
    console.error('❌ Company not found');
    process.exit(1);
  }

  const productsData = [
    {
      slug: 'pleated-chiffon-gown',
      variants: [
        { name: 'Color: Red | Size: S', sku: 'PCG-RED-S', price: 4500, stock: 10 },
        { name: 'Color: Red | Size: M', sku: 'PCG-RED-M', price: 4500, stock: 15 },
        { name: 'Color: Black | Size: S', sku: 'PCG-BLK-S', price: 4500, stock: 8 },
        { name: 'Color: Black | Size: M', sku: 'PCG-BLK-M', price: 4500, stock: 12 },
      ]
    },
    {
      slug: 'luxury-silk-evening-dress',
      variants: [
        { name: 'Size: S', sku: 'LSE-S', price: 6800, stock: 5 },
        { name: 'Size: M', sku: 'LSE-M', price: 6800, stock: 10 },
      ]
    },
    {
      slug: 'silk-slip-midi-dress',
      variants: [
        { name: 'Color: Emerald | Size: Free', sku: 'SSM-EMR-F', price: 3200, stock: 20 },
      ]
    }
  ];

  for (const p of productsData) {
    const product = await prisma.product.findFirst({
      where: {
        slug: p.slug,
        companyId: company.id
      }
    });

    if (!product) {
      console.log(`⚠️ Product not found: ${p.slug}`);
      continue;
    }

    console.log(`📦 Updating Variants for: ${product.slug}`);

    // Remove old variants to avoid SKU conflicts or cleanup
    await prisma.productVariant.deleteMany({
      where: { productId: product.id }
    });

    // Add New Variants
    for (const v of p.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock
        }
      });
    }
    console.log(`   └─ ${p.variants.length} variants updated.`);
  }

  console.log('🚀 Aura Chic Variants Re-Seeded Successfully!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
