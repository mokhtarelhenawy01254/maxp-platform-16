const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const slug = 'swan';
    console.log(`Searching for company with slug or id: ${slug}`);
    
    // Check all companies to see if we have similar names
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { slug: { contains: slug, mode: 'insensitive' } },
          { name: { contains: slug, mode: 'insensitive' } },
          { id: slug }
        ]
      }
    });

    console.log('--- Matching Companies ---');
    console.log(JSON.stringify(companies, null, 2));

    if (companies.length > 0) {
      for (const company of companies) {
        const productCount = await prisma.product.count({
          where: { companyId: company.id }
        });
        const activeProductCount = await prisma.product.count({
          where: { companyId: company.id, isActive: true, isHidden: false }
        });
        console.log(`Company: ${company.name} (${company.id})`);
        console.log(`- Slug: ${company.slug}`);
        console.log(`- IsActive: ${company.isActive}`);
        console.log(`- Total Products: ${productCount}`);
        console.log(`- Active/Public Products: ${activeProductCount}`);
        
        const categories = await prisma.category.findMany({
          where: { companyId: company.id }
        });
        console.log(`- Categories: ${categories.length}`);
      }
    } else {
      console.log('No matching companies found at all.');
    }

  } catch (error) {
    console.error('Error during check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
