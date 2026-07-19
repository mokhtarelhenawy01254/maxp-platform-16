require('dotenv').config();
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true, isActive: true } });
  console.log('Companies:', JSON.stringify(companies, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
