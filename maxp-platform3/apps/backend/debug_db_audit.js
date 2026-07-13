const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Use the same path as sharedDatabase.js
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('--- Database Audit (v2) ---');
  console.log('Using Database URL:', (process.env.POSTGRES_URL || process.env.DATABASE_URL).replace(/:[^:]+@/, ':****@'));
  
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('Total Companies:', companies.length);
  // console.log('Companies:', JSON.stringify(companies, null, 2));

  const targetId = 'cmmhkxobb0000pk440j1n6ui';
  const targetCompany = await prisma.company.findUnique({
    where: { id: targetId }
  });
  console.log(`Checking target ID ${targetId}:`, targetCompany ? `Found (${targetCompany.name})` : 'Not Found');
  
  if (targetCompany) {
    const templates = await prisma.homepageTemplate.findMany({
      where: { companyId: targetId },
      select: { id: true, name: true, isActive: true }
    });
    console.log(`Templates for ${targetId}:`, JSON.stringify(templates, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
