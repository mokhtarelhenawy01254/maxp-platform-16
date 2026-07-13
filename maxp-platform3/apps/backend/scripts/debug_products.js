const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      slug: { in: ['aura-chic-test', 'velvet-vine'] }
    },
    select: { id: true, name: true, slug: true }
  });
  console.log('Companies:', JSON.stringify(companies, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma && prisma.$disconnect) await prisma.$disconnect();
  });
