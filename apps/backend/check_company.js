
const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function check() {
  try {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { slug: 'maxp' },
          { id: 'maxp' }
        ]
      },
      select: { id: true, name: true, slug: true }
    });
    console.log('COMPANIES:', JSON.stringify(companies, null, 2));
    
    const allCompanies = await prisma.company.findMany({
       take: 5,
       select: { id: true, name: true, slug: true }
    });
    console.log('SAMPLE COMPANIES:', JSON.stringify(allCompanies, null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
