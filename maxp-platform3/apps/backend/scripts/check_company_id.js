const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function run() {
  const prisma = getSharedPrismaClient();
  if (!prisma) {
    console.error('Failed to get prisma client');
    process.exit(1);
  }
  const company = await prisma.company.findUnique({
    where: { slug: 'maxp' },
    select: { id: true }
  });
  console.log('Result:', JSON.stringify(company));
}

run();
