
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const specificId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
      console.log(`Checking in company: ${company.name} (${company.id})...`);
      // Since we are using the shared Prisma client which HAS RLS,
      // we need to set the context or use a raw query if RLS is enforced at DB level.
      // But let's try findFirst with companyId first.
      
      const product = await prisma.product.findFirst({
        where: { 
            id: specificId,
            companyId: company.id
        }
      });
      
      if (product) {
          console.log(`  FOUND in ${company.name}!`);
      } else {
          console.log(`  Not found in ${company.name}.`);
      }
  }
}

main().catch(console.error);
