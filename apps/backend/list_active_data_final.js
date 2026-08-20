const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  try {
    console.log('🔄 Initializing Prisma...');
    const prisma = await getSharedPrismaClientAsync();
    
    if (!prisma) {
      console.error('❌ Prisma client not initialized');
      return;
    }

    console.log('🔄 Fetching active companies...');
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      take: 5,
      select: { id: true, name: true, slug: true }
    });

    console.log('--- Active Companies ---');
    if (companies.length === 0) {
      console.log('No active companies found.');
    }

    for (const company of companies) {
      const products = await prisma.product.findMany({
        where: { companyId: company.id, isActive: true },
        take: 1,
        select: { id: true, name: true, slug: true, price: true }
      });
      
      console.log(`Company: ${company.name} | Slug: ${company.slug} | Sync Products: ${products.length}`);
      if (products.length > 0) {
        console.log(`  -> Product: ${products[0].name} (Slug: ${products[0].slug}, ID: ${products[0].id}, Price: ${products[0].price})`);
      }
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    process.exit(0);
  }
}

main();
