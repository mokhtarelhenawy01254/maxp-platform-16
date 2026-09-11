#!/usr/bin/env node
/**
 * Audit Company Subscriptions across Store App Slugs.
 * Safe, read-only inspection tool.
 *
 * Usage:
 *   node scripts/audit_store_subscriptions.js
 */
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { STORE_APP_SLUGS } = require('../middleware/checkAppAccess');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    console.error('❌ Could not initialize Prisma client.');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('  🔍 MAXP STORE APPS SUBSCRIPTION AUDIT');
  console.log('====================================================\n');

  try {
    const apps = await prisma.marketplaceApp.findMany({
      where: { slug: { in: STORE_APP_SLUGS } },
      select: {
        id: true,
        slug: true,
        name: true,
        pricingModel: true,
        monthlyPrice: true,
        isActive: true,
        isPublic: true,
      },
    });

    if (apps.length === 0) {
      console.log('⚠️ No store apps found in database matching slugs:', STORE_APP_SLUGS);
      return;
    }

    console.log('📦 Marketplace Apps in Database:');
    console.table(
      apps.map((a) => ({
        ID: a.id,
        Slug: a.slug,
        Name: a.name,
        Active: a.isActive,
        Public: a.isPublic,
        Pricing: a.pricingModel,
        Price: a.monthlyPrice ? `${a.monthlyPrice} EGP` : '—',
      }))
    );

    const appIds = apps.map((a) => a.id);
    const installations = await prisma.companyApp.findMany({
      where: { appId: { in: appIds } },
      select: {
        id: true,
        companyId: true,
        appId: true,
        status: true,
        activePricingModel: true,
        app: { select: { slug: true, name: true } },
      },
    });

    console.log('\n📊 Company Installations Summary:');
    const summaryBySlug = {};
    for (const slug of STORE_APP_SLUGS) {
      summaryBySlug[slug] = {
        total: 0,
        active: 0,
        trial: 0,
        cancelled: 0,
        other: 0,
      };
    }

    for (const inst of installations) {
      const slug = inst.app?.slug;
      if (!slug || !summaryBySlug[slug]) continue;
      summaryBySlug[slug].total++;
      const status = String(inst.status || '').toUpperCase();
      if (status === 'ACTIVE') summaryBySlug[slug].active++;
      else if (status === 'TRIAL') summaryBySlug[slug].trial++;
      else if (['CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(status)) summaryBySlug[slug].cancelled++;
      else summaryBySlug[slug].other++;
    }

    console.table(summaryBySlug);
    console.log(`Total Company Installations checked: ${installations.length}\n`);

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
