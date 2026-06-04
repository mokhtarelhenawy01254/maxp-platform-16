
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const user = await prisma.user.findFirst({
    where: { email: 'admin@admin.com' }
  });

  if (user) {
    console.log(`Found user: [${user.id}] ${user.email}`);
    console.log(`Company ID: ${user.companyId}`);
    
    if (user.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId }
      });
      console.log(`Company: ${company?.name} [${company?.slug}]`);
    }
  } else {
    console.log('User admin@admin.com not found.');
  }
}

main().catch(console.error);
