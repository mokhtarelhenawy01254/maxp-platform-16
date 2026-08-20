const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

async function main() {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, slug: true },
      take: 10
    });
    console.log(JSON.stringify(companies, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
