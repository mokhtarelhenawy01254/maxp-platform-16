const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  console.log('🌱 Starting Aura Chic Fashion Data Seeding (v2)...');

  // 1. Find or create the company
  let company = await prisma.company.findUnique({
    where: { slug: 'aura-chic-test' }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Aura Chic Boutique',
        slug: 'aura-chic-test',
        settings: {
          storefront: {
            theme: 'aura-chic',
            currency: 'SAR'
          }
        }
      }
    });
    console.log('Created company:', company.slug);
  } else {
    console.log('Found existing company:', company.slug);
  }

  const companyId = company.id;

  // 2. Clear existing data for this company
  // Note: We delete in order of dependencies
  await prisma.productVariant.deleteMany({ where: { product: { companyId } } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.category.deleteMany({ where: { companyId } });
  
  console.log('Cleared old products and categories for a fresh start.');

  // 3. Create Categories
  const catDresses = await prisma.category.create({
    data: {
      name: 'Dresses',
      slug: 'dresses',
      description: 'Elegant evening and casual dresses',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      companyId,
      isActive: true,
      sortOrder: 1
    }
  });

  const catAccessories = await prisma.category.create({
    data: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Chic bags, sunglasses, and jewelry',
      image: 'https://images.unsplash.com/photo-1549298240-0d8e60513026?w=800&q=80',
      companyId,
      isActive: true,
      sortOrder: 2
    }
  });

  const catNewArrivals = await prisma.category.create({
    data: {
      name: 'New Arrivals',
      slug: 'new-arrivals',
      description: 'The latest fashion trends',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      companyId,
      isActive: true,
      sortOrder: 3
    }
  });

  // 4. Products Data with variant info
  const productsData = [
    {
      name: 'Silk Slip Midi Dress',
      slug: 'silk-slip-midi-dress',
      description: 'A timeless elegance staple. This silk midi dress falls gracefully and is perfect for evening wear.',
      price: 299.99,
      comparePrice: 350.00,
      stock: 50,
      sku: 'DRS-SLK-001',
      isActive: true,
      categoryId: catDresses.id,
      mainImage: 'https://images.unsplash.com/photo-1572804013309-8260b9432f8b?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1572804013309-8260b9432f8b?w=800&q=80',
        'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=800&q=80'
      ].join(','),
      variants: [
        { name: 'Champagne / S', price: 299.99, stock: 10 },
        { name: 'Champagne / M', price: 299.99, stock: 15 },
        { name: 'Midnight Black / S', price: 299.99, stock: 10 },
        { name: 'Midnight Black / M', price: 299.99, stock: 15 }
      ]
    },
    {
      name: 'Pleated Chiffon Gown',
      slug: 'pleated-chiffon-gown',
      description: 'Float through your next event in this ethereal pleated chiffon gown.',
      price: 450.00,
      comparePrice: null,
      stock: 12,
      sku: 'DRS-CHF-002',
      isActive: true,
      categoryId: catDresses.id,
      mainImage: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
        'https://images.unsplash.com/photo-1566174053678-5db0d68f2921?w=800&q=80'
      ].join(','),
      variants: [
        { name: 'Rose Gold / XS', price: 450.00, stock: 4 },
        { name: 'Rose Gold / S', price: 450.00, stock: 4 },
        { name: 'Emerald / S', price: 450.00, stock: 4 }
      ]
    },
    {
      name: 'Minimalist Leather Tote',
      slug: 'minimalist-leather-tote',
      description: 'Crafted from premium Italian leather, this structured tote is the ultimate everyday companion.',
      price: 180.00,
      comparePrice: 220.00,
      stock: 35,
      sku: 'ACC-TOT-001',
      isActive: true,
      categoryId: catAccessories.id,
      mainImage: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&q=80',
        'https://images.unsplash.com/photo-1584916201243-d8cb84931a7b?w=800&q=80'
      ].join(','),
      variants: [
        { name: 'Tan', price: 180.00, stock: 20 },
        { name: 'Black', price: 180.00, stock: 15 }
      ]
    },
    {
      name: 'Oversized Geometric Sunglasses',
      slug: 'oversized-geometric-sunglasses',
      description: 'Make a statement with these bold, oversized geometric frames.',
      price: 85.00,
      stock: 100,
      sku: 'ACC-SUN-002',
      isActive: true,
      categoryId: catAccessories.id,
      mainImage: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      images: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      variants: [
        { name: 'Tortoiseshell', price: 85.00, stock: 50 },
        { name: 'Matte Black', price: 85.00, stock: 50 }
      ]
    },
    {
      name: 'Structured Linen Blazer',
      slug: 'structured-linen-blazer',
      description: 'Elevate any look with this breathable linen blazer. Tailored for a relaxed yet sophisticated fit.',
      price: 155.00,
      comparePrice: null,
      stock: 20,
      sku: 'APP-BLZ-001',
      isActive: true,
      categoryId: catNewArrivals.id,
      mainImage: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80',
      images: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80',
      variants: [
        { name: 'Oatmeal / M', price: 155.00, stock: 10 },
        { name: 'Navy / M', price: 155.00, stock: 10 }
      ]
    }
  ];

  for (const p of productsData) {
    const { variants, ...productData } = p;
    
    const product = await prisma.product.create({
      data: {
        ...productData,
        companyId,
        isFeatured: true
      }
    });

    for (const v of variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          sku: `${p.sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`,
          price: v.price,
          stock: v.stock,
          isActive: true
        }
      });
    }
    console.log(`Created product: ${product.name} with ${variants.length} variants.`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Error during seeding:\n', e.stack || e);
    process.exit(1);
  })
  .finally(() => {
    console.log('Finished');
  });
