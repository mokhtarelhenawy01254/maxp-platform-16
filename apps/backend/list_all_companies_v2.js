const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } }
});

async function main() {
  const companies = await prisma.company.findMany();
  console.log('--- All Companies (Detailed) ---');
  companies.forEach(c => {
    console.log(`ID: ${c.id} | Name: ${c.name} | Slug: ${c.slug} | IsActive: ${c.isActive}`);
  });
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
