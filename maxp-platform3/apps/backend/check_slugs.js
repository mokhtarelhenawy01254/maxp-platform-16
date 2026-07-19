const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function run() {
  try {
    const companies = await prisma.company.findMany({
      select: { slug: true, isActive: true }
    });
    console.log(JSON.stringify(companies, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
