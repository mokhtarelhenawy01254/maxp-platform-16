
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function listCompanies() {
  const prisma = await getSharedPrismaClientAsync();
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
    take: 20
  });
  console.log(JSON.stringify(companies, null, 2));
}

listCompanies().catch(console.error);
