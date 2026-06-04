const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

const AURA_CHIC_TOKENS = {
  colors: {
    primary: "#333333",
    accent: "#D4AF37",
    secondary: "#FBF7F2",
    text: "#333333",
    background: "#FFFFFF"
  },
  typography: {
    headingFont: "Playfair Display",
    bodyFont: "Montserrat"
  }
};

async function main() {
  const companySlug = 'aura-chic-test';
  const companyName = 'Aura Chic Fashion';

  console.log(`🚀 Creating/Resetting Company: ${companyName}`);

  // 1. Upsert Company
  let company = await prisma.company.findFirst({ where: { slug: companySlug } });
  if (!company) {
      company = await prisma.company.create({
          data: {
              name: companyName,
              slug: companySlug,
              email: 'hello@aurachic.com',
              currency: 'EGP',
              isActive: true
          }
      });
  } else {
       company = await prisma.company.update({
          where: { id: company.id },
          data: { name: companyName, isActive: true }
      });
  }

  const companyId = company.id;
  console.log(`✅ Company ID: ${companyId}`);

  // 2. Clear existing data
  console.log('🧹 Cleaning existing data...');
  try {
    await prisma.homepageTemplate.deleteMany({ where: { companyId } });
    await prisma.productVariant.deleteMany({ where: { product: { companyId } } });
    await prisma.product.deleteMany({ where: { companyId } });
    await prisma.category.deleteMany({ where: { companyId } });
    await prisma.storefrontSettings.deleteMany({ where: { companyId } });
  } catch (e) {
    console.log('⚠️ Cleanup warning:', e.message);
  }

  // 3. Create Storefront Settings (Map to Aura Chic theme)
  console.log('⚙️ Creating Storefront Settings...');
  const designTokens = {
    ...AURA_CHIC_TOKENS,
    shopStudio: {
      layoutPattern: 'aura-chic',
      layout: {
        type: 'grid',
        desktopColumns: 3,
        mobileColumns: 2,
        sidebarPosition: 'left',
        paginationType: 'numbers'
      }
    }
  };

  await prisma.storefrontSettings.create({
    data: {
      companyId,
      quickViewEnabled: true,
      filterByPrice: true,
      supportedLanguages: 'ar,en'
    }
  });

  // 4. Create Categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Dresses', slug: 'dresses', companyId, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop', isActive: true } }),
    prisma.category.create({ data: { name: 'Accessories', slug: 'accessories', companyId, image: 'https://images.unsplash.com/photo-1621072156002-e2f5ffc0a114?q=80&w=1000&auto=format&fit=crop', isActive: true } }),
    prisma.category.create({ data: { name: 'Outerwear', slug: 'outerwear', companyId, image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=1000&auto=format&fit=crop', isActive: true } }),
    prisma.category.create({ data: { name: 'Tops', slug: 'tops', companyId, image: 'https://images.unsplash.com/photo-1434389670869-c8873cb58c85?q=80&w=1000&auto=format&fit=crop', isActive: true } })
  ]);
  console.log(`✅ Created ${categories.length} Categories`);

  // 5. Create Products with Variants
  console.log('🏷️ Creating products & variants...');
  const productsData = [
    { 
        name: 'The Midnight Silk Slip Dress', 
        description: 'An elegant pure silk slip dress designed for evening soirées. Flows effortlessly.', 
        price: 3200, 
        categoryId: categories[0].id, 
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop', 
        isActive: true, 
        slug: 'midnight-silk-slip',
        variants: [
            { name: 'Black / Small', price: 3200, stock: 5 },
            { name: 'Black / Medium', price: 3200, stock: 8 },
            { name: 'Black / Large', price: 3200, stock: 2 }
        ]
    },
    { 
        name: 'Aurelia Gold Plated Choker', 
        description: 'A timeless 18k gold-plated choker to elevate any outfit.', 
        price: 1850, 
        categoryId: categories[1].id, 
        image: 'https://images.unsplash.com/photo-1599643478514-4a4e0e044d08?q=80&w=1000&auto=format&fit=crop', 
        isActive: true, 
        slug: 'aurelia-gold-choker',
        variants: [
            { name: 'Gold', price: 1850, stock: 15 }
        ]
    },
    { 
        name: 'Cashmere Blend Trench Coat', 
        description: 'A structural masterpiece. Lightweight yet incredibly warm cashmere blend coat.', 
        price: 6500, 
        categoryId: categories[2].id, 
        image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=1000&auto=format&fit=crop', 
        isActive: true, 
        slug: 'cashmere-trench-coat',
        variants: [
            { name: 'Camel / Medium', price: 6500, stock: 4 },
            { name: 'Camel / Large', price: 6500, stock: 3 },
            { name: 'Charcoal / Medium', price: 6500, stock: 2 }
        ]
    },
    { 
        name: 'Pleated Satin Blouse', 
        description: 'A gorgeous satin blouse with delicate pleating for a sophisticated office or evening look.', 
        price: 2100, 
        categoryId: categories[3].id, 
        image: 'https://images.unsplash.com/photo-1434389670869-c8873cb58c85?q=80&w=1000&auto=format&fit=crop', 
        isActive: true, 
        slug: 'pleated-satin-blouse',
        variants: [
            { name: 'Ivory / Small', price: 2100, stock: 10 },
            { name: 'Ivory / Medium', price: 2100, stock: 12 },
            { name: 'Blush / Small', price: 2100, stock: 5 }
        ]
    }
  ];

  for (const p of productsData) {
    const product = await prisma.product.create({ 
      data: { 
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId: p.categoryId,
        mainImage: p.image,
        companyId,
        isActive: p.isActive,
        slug: p.slug
      } 
    });

    if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
            await prisma.productVariant.create({
                data: {
                    productId: product.id,
                    name: v.name,
                    price: v.price,
                    stock: v.stock,
                    sku: `AURA-${product.id.substring(0,4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
                }
            })
        }
    }
  }
  console.log(`✅ Created ${productsData.length} Products with Variants`);

  console.log('\n✨ SUCCESS! Aura Chic Test Data Seeded');
  console.log('--------------------------------------------------');
  console.log(`Company Slug: ${companySlug}`);
  console.log(`Preview URL: http://localhost:3000/?companyId=${companyId}`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
