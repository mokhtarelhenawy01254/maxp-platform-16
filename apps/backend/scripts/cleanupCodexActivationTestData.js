require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const TARGET_EMAIL_PREFIXES = [
  'codex.onboard.20260428',
  'codex.provision.20260428',
  'codex.ar.register.',
  'codex.browser.ar.register.',
  'codex.funnel.',
];

async function cleanupCodexActivationTestData() {
  const prisma = getSharedPrismaClient();

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: TARGET_EMAIL_PREFIXES.map((prefix) => ({
          email: { startsWith: prefix },
        })),
      },
      select: {
        id: true,
        email: true,
        companyId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const companyIds = [...new Set(users.map((user) => user.companyId).filter(Boolean))];

    const companies = companyIds.length
      ? await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    console.log(
      JSON.stringify(
        {
          targetEmailPrefixes: TARGET_EMAIL_PREFIXES,
          matchedUsers: users,
          matchedCompanies: companies,
        },
        null,
        2,
      ),
    );

    for (const company of companies) {
      await prisma.userInvitation.deleteMany({
        where: { companyId: company.id },
      });

      await prisma.company.delete({
        where: { id: company.id },
      });
    }

    const remainingUsers = await prisma.user.findMany({
      where: {
        OR: TARGET_EMAIL_PREFIXES.map((prefix) => ({
          email: { startsWith: prefix },
        })),
      },
      select: {
        id: true,
        email: true,
        companyId: true,
      },
    });

    const remainingCompanies = companies.length
      ? await prisma.company.findMany({
          where: {
            OR: companies.map((company) => ({ id: company.id })),
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

    console.log(
      JSON.stringify(
        {
          deletedCompanyCount: companies.length,
          deletedUserCountEstimate: users.length,
          remainingUsers,
          remainingCompanies,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('❌ Failed to clean Codex activation test data:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupCodexActivationTestData();
