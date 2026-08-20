const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();
  
  const company = await prisma.company.findFirst();
  console.log('Company:', JSON.stringify(company, null, 2));
}

main().catch(console.error).finally(() => process.exit());
