const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();
  
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, subdomain: true }
  });
  console.log('Companies:', JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(() => process.exit());
