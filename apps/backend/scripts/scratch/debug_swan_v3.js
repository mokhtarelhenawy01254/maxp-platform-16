const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'prisma', 'generated', 'postgresql_v2'));

const prisma = new PrismaClient();

async function check() {
  try {
    const slug = 'swan';
    console.log(`🔍 [DEBUG] Searching for company with slug: ${slug}`);
    
    // Find company by slug (ignoring isActive for a moment)
    const company = await prisma.company.findUnique({
      where: { slug: slug }
    });

    if (!company) {
      console.log('❌ Company NOT FOUND in database.');
      // List some companies to see what's available
      const all = await prisma.company.findMany({ take: 5, select: { slug: true, isActive: true } });
      console.log('Available slugs:', all.map(c => `${c.slug} (${c.isActive ? 'Active' : 'Inactive'})`).join(', '));
      return;
    }

    console.log('✅ Company Found:', {
      id: company.id,
      name: company.name,
      slug: company.slug,
      isActive: company.isActive
    });

    const categoriesCount = await prisma.category.count({ where: { companyId: company.id } });
    const productsCount = await prisma.product.count({ where: { companyId: company.id } });
    const activeProductsCount = await prisma.product.count({
      where: { companyId: company.id, isActive: true, isHidden: false }
    });

    console.log(`📊 Statistics for ${company.name}:`);
    console.log(`- Categories: ${categoriesCount}`);
    console.log(`- Total Products: ${productsCount}`);
    console.log(`- Active & Public Products: ${activeProductsCount}`);

    if (productsCount > 0 && activeProductsCount === 0) {
      console.log('⚠️ Warning: Products exist but none are active/public.');
      const sample = await prisma.product.findMany({
        where: { companyId: company.id },
        take: 3,
        select: { name: true, isActive: true, isHidden: true }
      });
      console.log('Sample products:', sample);
    }

  } catch (error) {
    console.error('❌ Error during check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
