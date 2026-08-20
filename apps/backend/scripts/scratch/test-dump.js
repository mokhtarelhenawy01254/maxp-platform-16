const { storefrontThemeCatalogService } = require('./services/storefrontThemeCatalogService');
async function v() {
  try {
    const catalog = await storefrontThemeCatalogService.getAdminCatalog();
    const item = catalog.find(i => i.slug === 'nova-mobile');
    console.log(JSON.stringify(item, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
v();
