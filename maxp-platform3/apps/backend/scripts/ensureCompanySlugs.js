const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { ensureCompanySlug } = require('../utils/companySlug');

async function main() {
  const prisma = getSharedPrismaClient();
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      slug: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (companies.length === 0) {
    console.log('✅ All companies already have slugs.');
    return;
  }

  console.log(`🔧 Found ${companies.length} companies without slugs.`);

  for (const company of companies) {
    const updated = await ensureCompanySlug(company, { prisma });
    console.log(`✅ ${company.name} -> ${updated.slug}`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Failed to ensure company slugs:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getSharedPrismaClient().$disconnect();
    } catch (error) {
      console.error('⚠️ Failed to close Prisma client cleanly:', error);
    }
  });
