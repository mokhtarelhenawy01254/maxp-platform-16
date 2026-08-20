const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const slug = 'swan';
    console.log(`Checking for company with slug or id: ${slug}`);
    
    const companyBySlug = await prisma.company.findUnique({
      where: { slug: slug }
    });
    console.log('Company by slug:', companyBySlug ? JSON.stringify(companyBySlug, null, 2) : 'NOT FOUND');

    const companyById = await prisma.company.findUnique({
      where: { id: slug }
    });
    console.log('Company by id:', companyById ? JSON.stringify(companyById, null, 2) : 'NOT FOUND');

    const allCompanies = await prisma.company.findMany({
      select: { id: true, slug: true, name: true, isActive: true },
      take: 10
    });
    console.log('First 10 companies:', JSON.stringify(allCompanies, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
