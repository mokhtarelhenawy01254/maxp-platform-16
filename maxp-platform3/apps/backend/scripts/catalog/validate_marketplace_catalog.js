const path = require("path");
const { MarketplaceCatalogService } = require("../../services/catalog/marketplaceCatalogService");

async function main() {
  const customRoot = process.env.MARKETPLACE_CATALOG_DIR
    ? path.resolve(process.cwd(), process.env.MARKETPLACE_CATALOG_DIR)
    : undefined;

  const service = new MarketplaceCatalogService(
    customRoot
      ? { catalogRoot: customRoot }
      : {}
  );

  const snapshot = await service.getSnapshot({ forceReload: true });
  const warningCount = snapshot.validation?.warnings?.length || 0;

  console.log("[catalog] marketplace catalog validation passed");
  console.log(`[catalog] root: ${service.getCatalogRoot()}`);
  console.log(`[catalog] version: ${snapshot.meta.catalogVersion}`);
  console.log(`[catalog] hash: ${snapshot.hash}`);
  console.log(`[catalog] apps: ${snapshot.validation.stats.apps}`);
  console.log(`[catalog] bundles: ${snapshot.validation.stats.bundles}`);
  console.log(`[catalog] categories: ${snapshot.validation.stats.categories}`);
  console.log(`[catalog] warnings: ${warningCount}`);

  if (warningCount > 0) {
    snapshot.validation.warnings.forEach((warning) => {
      console.log(`[catalog][warn] ${warning.path}: ${warning.message}`);
    });
  }
}

main().catch((error) => {
  console.error("[catalog] marketplace catalog validation failed");
  console.error(error.message);
  process.exit(1);
});
