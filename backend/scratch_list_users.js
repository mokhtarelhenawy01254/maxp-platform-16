
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const users = await prisma.user.findMany({
    take: 5
  });
  console.log(`Found ${users.length} users in current DB:`);
  users.forEach(u => console.log(`- [${u.id}] ${u.email} (Company: ${u.companyId})`));
}

main().catch(console.error);
