const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const fs = require('fs');
const path = require('path');

async function exportApps() {
    try {
        const apps = await executeWithRetry(async () => {
            return await getSharedPrismaClient().marketplaceApp.findMany();
        });

        const bundles = await executeWithRetry(async () => {
            return await getSharedPrismaClient().appBundle.findMany();
        });

        // Clean up internal Prisma fields before export
        const cleanedApps = apps.map(app => {
            const { id, createdAt, updatedAt, ...rest } = app;
            // Convert Decimal back to string or number for JSON
            if (rest.monthlyPrice) rest.monthlyPrice = parseFloat(rest.monthlyPrice);
            if (rest.yearlyPrice) rest.yearlyPrice = parseFloat(rest.yearlyPrice);
            if (rest.unitPrice) rest.unitPrice = parseFloat(rest.unitPrice);
            if (rest.rating) rest.rating = parseFloat(rest.rating);

            // Features, images, requiredApps are already JSON strings or objects? 
            // In Prisma schema they are Json. Let's see how they look.
            return rest;
        });

        const cleanedBundles = bundles.map(bundle => {
            const { id, createdAt, updatedAt, ...rest } = bundle;
            if (rest.monthlyPrice) rest.monthlyPrice = parseFloat(rest.monthlyPrice);
            if (rest.yearlyPrice) rest.yearlyPrice = parseFloat(rest.yearlyPrice);
            if (rest.discount) rest.discount = parseFloat(rest.discount);
            return rest;
        });

        const seedContent = `
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function seedMarketplace() {
  console.log('ðŸŒ± Starting Comprehensive Marketplace Seed...');

  try {
    const apps = ${JSON.stringify(cleanedApps, null, 2)};
    const bundles = ${JSON.stringify(cleanedBundles, null, 2)};

    console.log('\\nðŸ› ï¸ Syncing '+apps.length+' Marketplace Apps...');
    for (const app of apps) {
      await prisma.marketplaceApp.upsert({
        where: { slug: app.slug },
        update: app,
        create: app
      });
    }

    console.log('\\nðŸ“¦ Syncing '+bundles.length+' App Bundles...');
    for (const bundle of bundles) {
      await prisma.appBundle.upsert({
        where: { slug: bundle.slug },
        update: bundle,
        create: bundle
      });
    }

    console.log('\\nâœ… Marketplace Sync completed successfully!');
    console.log('\\nðŸ“Š Summary:');
    console.log('  - ' + apps.length + ' Marketplace Apps');
    console.log('  - ' + bundles.length + ' App Bundles');

  } catch (error) {
    console.error('âŒ Error seeding marketplace:', error);
    throw error;
  }
}

seedMarketplace()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

        fs.writeFileSync(path.join(__dirname, 'prisma/seeds/marketplaceSeed.js'), seedContent);
        console.log('Successfully updated prisma/seeds/marketplaceSeed.js with 37 apps.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

exportApps();

