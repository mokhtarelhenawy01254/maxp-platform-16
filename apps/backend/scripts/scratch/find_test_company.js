const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst({
      where: { products: { some: {} } },
      select: { id: true, name: true }
    });
    console.log(JSON.stringify(company));
  } catch (err) {
    console.error('Prisma Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
