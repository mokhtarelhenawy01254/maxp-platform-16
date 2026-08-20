const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'prisma', 'generated', 'postgresql_v2'));
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } }
});

async function seed() {
  try {
    console.log('--- 🦢 Seeding Swan Company (Robust Version) ---');
    
    // 1. Create Company
    const company = await prisma.company.upsert({
      where: { slug: 'swan' },
      update: { isActive: true },
      create: {
        name: 'Swan Store',
        slug: 'swan',
        email: 'swan-' + Date.now() + '@maxp.online', // Unique email
        isActive: true,
        currency: 'EGP'
      }
    });
    console.log('✅ Company created/updated:', company.id);

    // 2. Create minimal storefront settings
    try {
        await prisma.storefrontSettings.upsert({
            where: { companyId: company.id },
            update: {},
            create: {
                companyId: company.id,
                supportedLanguages: JSON.stringify(["ar"]),
                defaultLanguage: "ar"
            }
        });
        console.log('✅ Storefront settings created (minimal)');
    } catch (e) {
        console.log('⚠️ Failed minimal storefront settings (maybe already exists or schema diff):', e.message);
    }

    // 3. Create at least one product
    try {
        const product = await prisma.product.create({
            data: {
                companyId: company.id,
                name: 'منتج تجريبي سوان',
                slug: 'swan-test-product-' + Date.now(),
                description: 'هذا منتج تجريبي للتأكد من عمل المتجر',
                price: 100,
                isActive: true
            }
        });
        console.log('✅ Test product created:', product.id);
    } catch (e) {
        console.log('⚠️ Failed to create product:', e.message);
    }

    console.log('\n🚀 SEEDING COMPLETE');
    console.log('Expected Shop URL: https://swan.maxp.online/shop');

  } catch (error) {
    console.error('❌ Fatal Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
