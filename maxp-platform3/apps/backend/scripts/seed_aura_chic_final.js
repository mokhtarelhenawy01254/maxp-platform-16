const { t: i18n } = require('./i18n');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const companySlug = 'aura-chic-test';

  console.log('🌱 Seeding Aura Chic Products and Variants...');

  const company = await prisma.company.findUnique({
    where: { slug: companySlug }
  });

  if (!company) {
    console.error('❌ Company not found');
    process.exit(1);
  }

  // 1. Create Category
  const category = await prisma.category.upsert({
    where: { 
      companyId_slug: {
        slug: 'evening-wear',
        companyId: company.id
      }
    },
    update: { name: i18n.t('msg.2e14ee44') },
    create: {
      name: i18n.t('msg.2e14ee44'),
      slug: 'evening-wear',
      companyId: company.id
    }
  });

  console.log(`✅ Category ensured: ${category.name}`);

  const fashionImages = [
    'https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?w=800&q=80',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
  ];

  // 2. Create Products
  const productsData = [
    {
      slug: 'pleated-chiffon-gown',
      name: i18n.t('msg.dea90a6c'),
      description: i18n.t('msg.923252ec'),
      price: 4500,
      comparePrice: 5200,
      images: [fashionImages[0], fashionImages[4]],
      variants: [
        { name: 'Color: Red, Size: S', sku: 'PCG-RED-S', price: 4500, stock: 10 },
        { name: 'Color: Red, Size: M', sku: 'PCG-RED-M', price: 4500, stock: 15 },
        { name: 'Color: Black, Size: S', sku: 'PCG-BLK-S', price: 4500, stock: 8 },
        { name: 'Color: Black, Size: M', sku: 'PCG-BLK-M', price: 4500, stock: 12 },
      ]
    },
    {
      slug: 'luxury-silk-evening-dress',
      name: i18n.t('msg.a31ea729'),
      description: i18n.t('msg.bda941a2'),
      price: 6800,
      comparePrice: 7500,
      images: [fashionImages[1], fashionImages[3]],
      variants: [
        { name: 'Size: S', sku: 'LSE-S', price: 6800, stock: 5 },
        { name: 'Size: M', sku: 'LSE-M', price: 6800, stock: 10 },
      ]
    },
    {
      slug: 'silk-slip-midi-dress',
      name: i18n.t('msg.2cbd0698'),
      description: i18n.t('msg.f93f9833'),
      price: 3200,
      comparePrice: 3800,
      images: [fashionImages[2], fashionImages[1]],
      variants: [
        { name: 'Color: Emerald, Size: Free', sku: 'SSM-EMR-F', price: 3200, stock: 20 },
      ]
    },
    {
      slug: 'embroidered-tulle-gown',
      name: i18n.t('msg.a680b569'),
      description: i18n.t('msg.f5684516'),
      price: 5500,
      comparePrice: 6200,
      images: [fashionImages[3], fashionImages[0]],
      variants: [
        { name: 'Size: M', sku: 'ETG-M', price: 5500, stock: 7 },
      ]
    }
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: {
        companyId_slug: {
          slug: p.slug,
          companyId: company.id
        }
      },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        images: JSON.stringify(p.images),
        categoryId: category.id,
        isActive: true,
        stock: p.variants.reduce((acc, v) => acc + v.stock, 0)
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        images: JSON.stringify(p.images),
        categoryId: category.id,
        companyId: company.id,
        isActive: true,
        stock: p.variants.reduce((acc, v) => acc + v.stock, 0)
      }
    });

    console.log(`📦 Product ensured: ${product.slug}`);

    // Add Variants
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: {
          productId_sku: {
            productId: product.id,
            sku: v.sku
          }
        },
        update: {
          name: v.name,
          price: v.price,
          stock: v.stock
        },
        create: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock
        }
      });
    }
    console.log(`   └─ ${p.variants.length} variants added.`);
  }

  console.log('🚀 Aura Chic Seeding Completed!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
