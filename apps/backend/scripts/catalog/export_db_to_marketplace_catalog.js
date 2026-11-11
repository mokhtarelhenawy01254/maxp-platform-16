#!/usr/bin/env node

/**
 * export_db_to_marketplace_catalog.js
 * 
 * Exports live/target database pricing and specifications into
 * apps/backend/catalog/marketplace/apps.json to prevent drift and ensure
 * the file catalog remains the accurate Single Source of Truth.
 * 
 * Usage:
 *   node scripts/catalog/export_db_to_marketplace_catalog.js [--dry-run] [--slug=<slug>] [--all]
 */

const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient, closeSharedDatabase } = require('../../services/sharedDatabase');
const { marketplaceCatalogService } = require('../../services/catalog/marketplaceCatalogService');

const EXCLUDED_DB_APP_CATEGORIES = new Set(['THEME', 'TEMPLATE']);

const PRICE_FIELDS = [
  'monthlyPrice',
  'yearlyPrice',
  'pricingModel',
  'unitPrice',
  'unitName',
  'trialDays',
  'ppuBillingMethod'
];

const EXTENDED_FIELDS = [
  ...PRICE_FIELDS,
  'name',
  'description',
  'category',
  'isActive',
  'isPublic',
  'isFeatured',
  'isPopular'
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    slug: null,
    allFields: false,
    includeNew: false,
    syncBundles: false,
    help: false
  };

  argv.forEach((token) => {
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--all') {
      args.allFields = true;
      args.includeNew = true;
      args.syncBundles = true;
    }
    else if (token === '--include-new') args.includeNew = true;
    else if (token === '--bundles') args.syncBundles = true;
    else if (token.startsWith('--slug=')) args.slug = token.split('=')[1].trim();
    else if (token === '--help' || token === '-h') args.help = true;
  });

  return args;
}

function printHelp() {
  console.log('Usage: node scripts/catalog/export_db_to_marketplace_catalog.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run       Preview changes without writing to apps.json');
  console.log('  --slug=<slug>   Export pricing for a specific app only');
  console.log('  --all           Export name, description, and categories in addition to prices');
  console.log('  --help, -h      Show this help message');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const catalogDir = path.resolve(__dirname, '../../catalog/marketplace');
  const appsFilePath = path.join(catalogDir, 'apps.json');

  if (!fs.existsSync(appsFilePath)) {
    throw new Error(`Catalog file not found at ${appsFilePath}`);
  }

  const raw = fs.readFileSync(appsFilePath, 'utf8');
  const catalogApps = JSON.parse(raw);
  const prisma = getSharedPrismaClient();

  console.log(`[catalog:export-db] Loading marketplace apps from database...`);
  const whereClause = {
    category: {
      notIn: Array.from(EXCLUDED_DB_APP_CATEGORIES)
    }
  };
  if (args.slug) {
    whereClause.slug = args.slug;
  }

  const dbApps = await prisma.marketplaceApp.findMany({
    where: whereClause
  });

  const dbAppBySlug = new Map(dbApps.map((a) => [a.slug, a]));
  const fieldsToCompare = args.allFields ? EXTENDED_FIELDS : PRICE_FIELDS;

  let totalUpdatedApps = 0;
  const updatesSummary = [];

  for (const catalogApp of catalogApps) {
    if (args.slug && catalogApp.slug !== args.slug) continue;

    const dbApp = dbAppBySlug.get(catalogApp.slug);
    if (!dbApp) continue;

    const diffs = [];
    fieldsToCompare.forEach((field) => {
      let dbVal = dbApp[field] !== undefined ? dbApp[field] : null;
      let catVal = catalogApp[field] !== undefined ? catalogApp[field] : null;

      // Normalize numbers
      if (['monthlyPrice', 'yearlyPrice', 'trialDays'].includes(field)) {
        dbVal = dbVal != null ? Number(dbVal) : 0;
        catVal = catVal != null ? Number(catVal) : 0;
      }
      if (field === 'unitPrice') {
        dbVal = dbVal != null ? Number(dbVal) : null;
        catVal = catVal != null ? Number(catVal) : null;
      }

      // ppuBillingMethod is only meaningful if PAY_PER_USE
      if (field === 'ppuBillingMethod') {
        const isPpu = (dbApp.pricingModel === 'PAY_PER_USE' || dbApp.unitPrice != null);
        if (!isPpu) {
          dbVal = null;
          catVal = null;
        } else {
          dbVal = dbVal || 'PER_ORDER';
          catVal = catVal || 'PER_ORDER';
        }
      }

      if (dbVal !== catVal && dbVal !== undefined) {
        diffs.push({ field, from: catVal, to: dbVal });
        if (!args.dryRun) {
          catalogApp[field] = dbVal;
        }
      }
    });

    if (diffs.length > 0) {
      totalUpdatedApps++;
      if (!args.dryRun) {
        catalogApp.updatedAt = new Date().toISOString();
      }
      updatesSummary.push({
        slug: catalogApp.slug,
        name: catalogApp.name,
        diffs
      });
    }
  }

  let totalNewApps = 0;
  if (args.includeNew && !args.slug) {
    const existingSlugs = new Set(catalogApps.map((a) => a.slug));
    for (const dbApp of dbApps) {
      if (!existingSlugs.has(dbApp.slug)) {
        totalNewApps++;
        const newApp = {
          id: dbApp.id,
          slug: dbApp.slug,
          name: dbApp.name,
          nameEn: dbApp.nameEn || null,
          description: dbApp.description || '',
          descriptionEn: dbApp.descriptionEn || null,
          category: (dbApp.category || 'general').toUpperCase(),
          pricingModel: dbApp.pricingModel || (Number(dbApp.monthlyPrice) === 0 ? 'FREE' : 'SUBSCRIPTION'),
          monthlyPrice: Number(dbApp.monthlyPrice ?? 0),
          yearlyPrice: Number(dbApp.yearlyPrice ?? 0),
          unitPrice: dbApp.unitPrice != null ? Number(dbApp.unitPrice) : null,
          unitName: dbApp.unitName || null,
          ppuBillingMethod: dbApp.ppuBillingMethod || null,
          trialDays: dbApp.trialDays ?? 0,
          requiredApps: Array.isArray(dbApp.requiredApps) ? dbApp.requiredApps : [],
          positioning: dbApp.positioning || {
            audience: 'أصحاب المتاجر وفرق العمل في المنصة.',
            surface: dbApp.mainRoute || dbApp.adminRoute || 'لوحة التحكم وقسم التطبيقات.',
            outcome: dbApp.description ? (dbApp.description.length > 80 ? dbApp.description.slice(0, 77) + '...' : dbApp.description) : 'تحسين إدارة المتجر ورفع الكفاءة التشغيلية.'
          },
          features: dbApp.features && typeof dbApp.features === 'object' && !Array.isArray(dbApp.features) ? dbApp.features : {},
          isActive: dbApp.isActive !== false,
          isPublic: dbApp.isPublic !== false,
          isFeatured: dbApp.isFeatured === true,
          isPopular: dbApp.isPopular === true,
          icon: dbApp.icon || null,
          logo: dbApp.logo || null,
          coverImage: dbApp.coverImage || null,
          mainRoute: dbApp.mainRoute || null,
          adminRoute: dbApp.adminRoute || null,
          engineCompatibility: dbApp.engineCompatibility || null,
          createdAt: dbApp.createdAt ? new Date(dbApp.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (!args.dryRun) {
          catalogApps.push(newApp);
        }
        console.log(`  ➕ Added new DB app to catalog: ${dbApp.slug} (${dbApp.name})`);
      }
    }
  }

  // Sync Bundles if requested
  let totalUpdatedBundles = 0;
  if (args.syncBundles && !args.slug) {
    const bundlesFilePath = path.join(catalogDir, 'bundles.json');
    if (fs.existsSync(bundlesFilePath)) {
      const catalogBundles = JSON.parse(fs.readFileSync(bundlesFilePath, 'utf8'));
      const dbBundles = await prisma.appBundle.findMany();
      const dbBundleBySlug = new Map(dbBundles.map((b) => [b.slug, b]));
      const appSlugById = new Map(dbApps.map((a) => [a.id, a.slug]));

      for (const catBundle of catalogBundles) {
        const dbBundle = dbBundleBySlug.get(catBundle.slug);
        if (!dbBundle) continue;

        let bundleChanged = false;
        if (Number(catBundle.monthlyPrice) !== Number(dbBundle.monthlyPrice)) {
          catBundle.monthlyPrice = Number(dbBundle.monthlyPrice);
          bundleChanged = true;
        }
        if (Number(catBundle.discount) !== Number(dbBundle.discount)) {
          catBundle.discount = Number(dbBundle.discount);
          bundleChanged = true;
        }
        const dbAppSlugs = (Array.isArray(dbBundle.appIds) ? dbBundle.appIds : []).map((id) => appSlugById.get(id) || id).sort();
        if (JSON.stringify(catBundle.appSlugs || []) !== JSON.stringify(dbAppSlugs)) {
          catBundle.appSlugs = dbAppSlugs;
          bundleChanged = true;
        }
        if (bundleChanged) {
          totalUpdatedBundles++;
        }
      }

      if (!args.dryRun && totalUpdatedBundles > 0) {
        fs.writeFileSync(bundlesFilePath, JSON.stringify(catalogBundles, null, 2) + '\n', 'utf8');
        console.log(`✅ [catalog:export-db] Updated ${totalUpdatedBundles} bundle(s) in ${bundlesFilePath}`);
      }
    }
  }

  console.log(`[catalog:export-db] Compared ${catalogApps.length} catalog apps against DB.`);
  console.log(`- Apps with differences: ${totalUpdatedApps}`);
  if (totalNewApps > 0) {
    console.log(`- New apps added from DB: ${totalNewApps}`);
  }

  updatesSummary.forEach(({ slug, name, diffs }) => {
    console.log(`\n  📦 ${slug} (${name}):`);
    diffs.forEach(({ field, from, to }) => {
      console.log(`     • ${field}: ${JSON.stringify(from)} ➔ ${JSON.stringify(to)}`);
    });
  });

  if (args.dryRun) {
    console.log(`\n[catalog:export-db] Dry-run mode: No files were modified.`);
  } else if (totalUpdatedApps > 0 || totalNewApps > 0) {
    fs.writeFileSync(appsFilePath, JSON.stringify(catalogApps, null, 2) + '\n', 'utf8');
    marketplaceCatalogService?.clearCache?.();
    console.log(`\n✅ [catalog:export-db] Successfully written updates to ${appsFilePath}`);
  } else {
    console.log(`\n✅ [catalog:export-db] Catalog is already fully synchronized with DB.`);
  }

  await closeSharedDatabase();
}

main().catch((err) => {
  console.error('[catalog:export-db] Error:', err);
  process.exit(1);
});
