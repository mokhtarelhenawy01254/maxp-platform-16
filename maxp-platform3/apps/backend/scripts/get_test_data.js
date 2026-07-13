const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst();
    const user = await prisma.user.findFirst({
      where: { companyId: company?.id }
    });

    if (!company || !user) {
      console.log('NO_DATA');
      return;
    }

    console.log(JSON.stringify({ companyId: company.id, userId: user.id }));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
