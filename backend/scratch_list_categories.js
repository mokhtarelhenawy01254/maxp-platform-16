
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const categories = await prisma.category.findMany();
  console.log('Available categories:');
  categories.forEach(c => console.log(`- [${c.id}] ${c.name}`));
}

main().catch(console.error);
