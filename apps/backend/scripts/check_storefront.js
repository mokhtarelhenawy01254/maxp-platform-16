const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function check() {
  const template = await prisma.homepageTemplate.findFirst({
    where: { companyId: 'cmmhkxobb0000vpk440j1n6ui', isActive: true, pageType: 'HOMEPAGE' }
  });
  console.log(JSON.stringify(template?.content?.pages, null, 2));
  console.log(Array.isArray(template?.content?.pages) ? 'PAGES IS AN ARRAY' : 'PAGES IS NOT AN ARRAY');
}

check().finally(() => prisma.$disconnect());
