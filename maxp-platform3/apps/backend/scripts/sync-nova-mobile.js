const { storefrontThemeCatalogService } = require('../services/storefrontThemeCatalogService');
const tenantContext = require('../services/tenantContext');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function syncNovaMobile() {
  console.log('🔄 [SYNC] Starting sync for Nova Mobile theme...');

  try {
    // We run without tenant context for catalog management
    await storefrontThemeCatalogService.ensureCatalogSynced({ force: true });
    
    console.log('✅ [SYNC] Catalog sync completed successfully.');
    
    const prisma = await getSharedPrismaClientAsync();
    const app = await prisma.marketplaceApp.findUnique({
      where: { slug: 'nova-mobile' },
      select: {
        id: true,
        slug: true,
        name: true,
        features: true
      }
    });

    if (app) {
      console.log('📄 [SYNC] Found Nova Mobile record in DB:');
      console.log(JSON.stringify(app, null, 2));
      
      const colors = app.features?.preview?.colors || [];
      if (colors.length > 0) {
        console.log('🎨 [SYNC] SUCCESS: Preview colors are now present:', colors);
      } else {
        console.warn('⚠️ [SYNC] WARNING: Preview colors are still EMPTY in the DB.');
      }
    } else {
      console.error('❌ [SYNC] ERROR: Nova Mobile record NOT FOUND in DB after sync.');
    }
  } catch (error) {
    console.error('❌ [SYNC] Failed to sync Nova Mobile:', error);
    process.exit(1);
  }
}

syncNovaMobile()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
