const { PrismaClient } = require('./apps/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { email: 'wardegypt82@gmail.com' }
  });
  console.log('Company by email:', JSON.stringify(company, null, 2));

  const fioreCompany = await prisma.company.findFirst({
    where: {
      OR: [
        { email: { contains: 'ward' } },
        { slug: { contains: 'fiore' } },
        { customDomain: { contains: 'fiore' } }
      ]
    }
  });
  console.log('Fiore company:', JSON.stringify(fioreCompany, null, 2));

  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, email: true, customDomain: true }
  });
  console.log('All companies:', JSON.stringify(allCompanies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
