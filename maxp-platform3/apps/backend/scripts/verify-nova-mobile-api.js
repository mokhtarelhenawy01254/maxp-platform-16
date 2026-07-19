const { storefrontThemeCatalogService } = require('../services/storefrontThemeCatalogService');

async function verifyNovaMobileAPI() {
  console.log('🔍 [VERIFY] Fetching theme catalog...');

  try {
    const catalog = await storefrontThemeCatalogService.getAdminCatalog();
    
    const novaMobile = (catalog || []).find(item => item.slug === 'nova-mobile');
    
    if (novaMobile) {
      console.log('✅ [VERIFY] Found Nova Mobile in catalog.');
      console.log('🎨 [VERIFY] Preview Colors:', JSON.stringify(novaMobile.preview?.colors, null, 2));
      
      if (novaMobile.preview?.colors?.length > 0) {
        console.log('🚀 [VERIFY] SUCCESS: Nova Mobile now has colors in the API!');
      } else {
        console.error('❌ [VERIFY] FAILURE: Nova Mobile still has NO colors in the API.');
      }
    } else {
      console.error('❌ [VERIFY] FAILURE: Nova Mobile NOT FOUND in the catalog.');
    }
  } catch (error) {
    console.error('❌ [VERIFY] Error during verification:', error);
    process.exit(1);
  }
}

verifyNovaMobileAPI()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
