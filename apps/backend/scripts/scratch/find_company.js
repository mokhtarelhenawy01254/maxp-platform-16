const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst({
      where: {
        name: { contains: 'MaxP Platform', mode: 'insensitive' },
      },
    });
    console.log(JSON.stringify(company));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
