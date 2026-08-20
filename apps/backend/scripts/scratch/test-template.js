const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.homepageTemplate.findFirst({
    where: { companyId: 'cmmhkxobb0000vpk440j1n6ui' },
    select: { id: true, name: true, content: true, publishedContent: true }
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
