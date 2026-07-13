const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function inspectData() {
  console.log('--- StorefrontSettings Sample ---');
  const settings = await prisma.storefrontSettings.findMany({
    take: 3,
    select: { companyId: true, designTokens: true }
  });
  console.log(JSON.stringify(settings, null, 2));

  console.log('\n--- HomepageTemplate Sample ---');
  const templates = await prisma.homepageTemplate.findMany({
    where: { isActive: true, companyId: { not: null } },
    take: 3,
    select: { companyId: true, slug: true, isSystem: true, sourceSlug: true }
  });
  console.log(JSON.stringify(templates, null, 2));
}

inspectData().finally(() => prisma.$disconnect());
