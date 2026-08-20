const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } }
});

function toHex(str) {
  return Buffer.from(str).toString('hex');
}

async function main() {
  const companies = await prisma.company.findMany();
  console.log('--- ID Inspection ---');
  companies.forEach(c => {
    console.log(`Name: ${c.name}`);
    console.log(`  ID: "${c.id}" (Len: ${c.id.length}, Hex: ${toHex(c.id)})`);
    console.log(`  Slug: "${c.slug}" (Len: ${c.slug ? c.slug.length : 0}, Hex: ${c.slug ? toHex(c.slug) : ''})`);
  });
  
  const targetId = 'cmmhkxobb0000pk440j1n6ui';
  console.log(`--- Target Inspection ---`);
  console.log(`  Target: "${targetId}" (Len: ${targetId.length}, Hex: ${toHex(targetId)})`);
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
