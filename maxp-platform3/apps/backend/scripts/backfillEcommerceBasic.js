require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const APP_SLUG = 'ecommerce-basic';
const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];
const APPLY_MODE = process.argv.includes('--apply');

async function backfillEcommerceBasic() {
  const prisma = getSharedPrismaClient();

  try {
    const app = await prisma.marketplaceApp.findFirst({
      where: { slug: APP_SLUG, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        pricingModel: true,
      },
    });

    if (!app) {
      throw new Error(`Marketplace app "${APP_SLUG}" was not found`);
    }

    const targetCompanies = await prisma.company.findMany({
      where: {
        isActive: true,
        installedApps: {
          none: {
            appId: app.id,
            status: { in: ACTIVE_STATUSES },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(
      JSON.stringify(
        {
          mode: APPLY_MODE ? 'apply' : 'dry-run',
          app: { id: app.id, slug: app.slug, pricingModel: app.pricingModel },
          companyCount: targetCompanies.length,
          companies: targetCompanies.map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
          })),
        },
        null,
        2,
      ),
    );

    if (!APPLY_MODE || targetCompanies.length === 0) {
      return;
    }

    let installedCount = 0;
    let skippedCount = 0;
    const skippedCompanies = [];

    for (const company of targetCompanies) {
      try {
        await prisma.companyApp.upsert({
          where: {
            companyId_appId: {
              companyId: company.id,
              appId: app.id,
            },
          },
          update: {
            status: 'ACTIVE',
          },
          create: {
            companyId: company.id,
            appId: app.id,
            status: 'ACTIVE',
            activePricingModel: app.pricingModel || 'SUBSCRIPTION',
          },
        });

        installedCount += 1;
      } catch (error) {
        if (error?.code === 'P2003') {
          skippedCount += 1;
          skippedCompanies.push({
            id: company.id,
            name: company.name,
            slug: company.slug,
            reason: 'company_missing_during_apply',
          });
          continue;
        }

        throw error;
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          installedCount,
          skippedCount,
          skippedCompanies,
          appSlug: APP_SLUG,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('❌ Failed to backfill ecommerce-basic:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

backfillEcommerceBasic();
