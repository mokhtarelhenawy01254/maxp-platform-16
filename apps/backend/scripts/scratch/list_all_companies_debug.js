const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function listCompanies() {
  const prisma = await getSharedPrismaClientAsync();
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    where: { isActive: true }
  });

  console.log('--- Active Companies ---');
  companies.forEach(c => console.log(`${c.name} (${c.id})`));
}

listCompanies().catch(console.error);
