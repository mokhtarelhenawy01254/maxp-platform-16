#!/usr/bin/env node

const { getMarketplaceCatalogDbDiff } = require("../../services/catalog/marketplaceCatalogDiffService");

function parseArgs(argv) {
  const args = {
    json: false,
    failOnDiff: false,
    failOnChanged: false,
    help: false
  };

  argv.forEach((token) => {
    if (token === "--json") args.json = true;
    else if (token === "--fail-on-diff") args.failOnDiff = true;
    else if (token === "--fail-on-changed") args.failOnChanged = true;
    else if (token === "--help" || token === "-h") args.help = true;
  });

  return args;
}

function printHelp() {
  console.log("Usage: node scripts/catalog/diff_marketplace_catalog_vs_db.js [--json] [--fail-on-diff] [--fail-on-changed]");
  console.log("");
  console.log("Options:");
  console.log("  --json              Output machine-readable JSON");
  console.log("  --fail-on-diff      Exit with code 1 when any differences are found");
  console.log("  --fail-on-changed   Exit with code 1 when changed entries or missing DB entries are found");
}

function printSummary(summary) {
  console.log("[catalog:diff] Marketplace catalog vs DB");
  console.log(`- comparedAt: ${summary.comparedAt}`);
  console.log(`- catalog apps: ${summary.totals.catalogApps}, db apps: ${summary.totals.dbApps}`);
  console.log(`- catalog bundles: ${summary.totals.catalogBundles}, db bundles: ${summary.totals.dbBundles}`);
  console.log(`- total diff entries: ${summary.totals.diffEntries}`);
  console.log(`- apps missing in DB: ${summary.apps.missingInDb.length}`);
  console.log(`- apps extra in DB: ${summary.apps.extraInDb.length}`);
  console.log(`- apps changed: ${summary.apps.changed.length}`);
  console.log(`- bundles missing in DB: ${summary.bundles.missingInDb.length}`);
  console.log(`- bundles extra in DB: ${summary.bundles.extraInDb.length}`);
  console.log(`- bundles changed: ${summary.bundles.changed.length}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const summary = await getMarketplaceCatalogDbDiff();

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(summary);
  }

  if (args.failOnDiff && summary.totals.diffEntries > 0) {
    console.error(`[catalog:diff] ❌ Diff check failed: ${summary.totals.diffEntries} diff entries found.`);
    process.exit(1);
  }

  if (args.failOnChanged) {
    const changedAppsCount = summary.apps.changed.length;
    const changedBundlesCount = summary.bundles.changed.length;
    const missingAppsCount = summary.apps.missingInDb.length;
    const missingBundlesCount = summary.bundles.missingInDb.length;

    if (changedAppsCount > 0 || changedBundlesCount > 0 || missingAppsCount > 0 || missingBundlesCount > 0) {
      console.error(`[catalog:diff] ❌ CI Gate Failed: Specification drift detected!`);
      if (changedAppsCount > 0) console.error(`  - Changed apps: ${changedAppsCount}`);
      if (changedBundlesCount > 0) console.error(`  - Changed bundles: ${changedBundlesCount}`);
      if (missingAppsCount > 0) console.error(`  - Missing apps in DB: ${missingAppsCount}`);
      if (missingBundlesCount > 0) console.error(`  - Missing bundles in DB: ${missingBundlesCount}`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("[catalog:diff] Failed:", error.message);
  process.exit(2);
});
