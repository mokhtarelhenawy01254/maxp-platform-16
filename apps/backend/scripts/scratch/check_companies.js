const path = require('path');
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

async function main() {
  const ids = ['cmmzjisyt0000vp1w5t4g7gry', 'cmmhkxobb0000vpk440j1'];
  const companies = await prisma.company.findMany({
    where: { id: { in: ids } }
  });
  console.log('COMPANIES:');
  console.log(JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
