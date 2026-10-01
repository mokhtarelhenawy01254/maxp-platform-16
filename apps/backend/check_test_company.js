require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL } }
});

async function main() {
  try {
    const count = await prisma.company.count();
    console.log('Total companies:', count);

    const companies = await prisma.company.findMany({
      take: 10
    });

    console.log('Companies:', JSON.stringify(companies.map(c => ({ id: c.id, email: c.email, name: c.name })), null, 2));

    // Try to find the specific company
    const company = await prisma.company.findUnique({
      where: { email: 'mokhtar@mokhtar.mokhtar' }
    });

    console.log('Found company:', JSON.stringify(company, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main()
  .catch(e => console.error('Fatal:', e.message))
  .finally(() => prisma.$disconnect());
