const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  const company = await prisma.company.findFirst();
  console.log(JSON.stringify(company.settings, null, 2));
}

checkSettings().catch(console.error).finally(() => prisma.$disconnect());
