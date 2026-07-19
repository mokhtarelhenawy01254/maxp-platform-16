const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function getSlug() {
  const company = await prisma.company.findFirst();
  console.log(company.slug);
  await prisma.$disconnect();
}

getSlug();
