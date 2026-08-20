const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    take: 5,
    select: { id: true, slug: true, name: true }
  });
  console.log(JSON.stringify(companies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
