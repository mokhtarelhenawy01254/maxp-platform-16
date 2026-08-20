const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const tenantContext = require('./services/tenantContext');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();
  const companyId = 'maxp';
  
  // Set context for RLS
  tenantContext.run(companyId, async () => {
    try {
      console.log(`--- Checking products for company: ${companyId} ---`);
      const products = await prisma.product.findMany({
        where: { companyId },
        include: { category: true }
      });
      console.log(`Found ${products.length} products`);
      products.forEach(p => {
        console.log(`- [${p.isActive ? 'Active' : 'Inactive'}] ${p.name} (ID: ${p.id}, Slug: ${p.slug})`);
      });

      console.log(`\n--- Checking categories for company: ${companyId} ---`);
      const categories = await prisma.category.findMany({
        where: { companyId }
      });
      console.log(`Found ${categories.length} categories`);
      categories.forEach(c => {
        console.log(`- [${c.isActive ? 'Active' : 'Inactive'}] ${c.name} (ID: ${c.id}, Slug: ${c.slug})`);
      });
    } catch (err) {
      console.error('Error during DB check:', err);
    }
  });
}

main().catch(console.error);
