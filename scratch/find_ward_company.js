const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/prisma/generated/postgresql_v2'));
const prisma = new PrismaClient();

async function main() {
  console.log('Searching for company or user with wardegypt82@gmail.com or fiore...');

  const users = await prisma.$queryRaw`SELECT id, email, "firstName", "lastName", "companyId" FROM users WHERE email = 'wardegypt82@gmail.com' OR email LIKE '%ward%'`;
  console.log('Users found:', JSON.stringify(users, null, 2));

  const companies = await prisma.$queryRaw`SELECT id, name, slug, email, "customDomain" FROM companies WHERE email = 'wardegypt82@gmail.com' OR slug LIKE '%fiore%' OR name LIKE '%fiore%'`;
  console.log('Companies found:', JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
