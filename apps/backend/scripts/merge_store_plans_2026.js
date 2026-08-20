#!/usr/bin/env node
/**
 * Migration: Restructure ECOMMERCE store plans (2026).
 *
 * Target customer-facing structure:
 *   1. ┘à╪¬╪¼╪▒ ╪¿┘ä╪│ (store-basic)    249 EGP/mo  ΓÇö basic plan
 *   2. ┘à╪¬╪¼╪▒ ╪¿╪▒┘ê (store-pro)      499 EGP/mo  ΓÇö pro plan
 *   3. ╪╣╪▒┘ê╪╢ ╪º┘ä┘â┘à┘è╪º╪¬ (quantity-offers-pro) 149 EGP/mo ΓÇö add-on
 *   4. ╪º┘ä┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐ (commerce-advanced) 179 EGP/mo ΓÇö add-on
 *   Removed: ┘å╪╕╪º┘à POS (pos-pro)
 *
 * This script:
 *   - Renames display metadata for the 4 kept apps (slug stays ΓåÆ installs preserved).
 *   - Deactivates + unpublishes legacy apps: store, ecommerce-basic, ecommerce-pro, pos-pro.
 *   - Migrates companyApp installs: store/ecommerce-basic ΓåÆ store-basic, ecommerce-pro ΓåÆ store-pro.
 *   - Remaps requiredApps arrays across all marketplace_apps:
 *       store ΓåÆ store-basic, ecommerce-basic ΓåÆ store-basic, ecommerce-pro ΓåÆ store-pro
 *
 * Usage:
 *   node scripts/merge_store_plans_2026.js [--dry-run]
 */
const { getSharedPrismaClientAsync, executeWithRetry } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

const RENAMES = {
  'store-basic': {
    name: '╪º┘ä┘à╪¬╪¼╪▒',
    nameEn: 'Store',
    description: '┘à╪¬╪¼╪▒ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘â╪º┘à┘ä: ┘à┘å╪¬╪¼╪º╪¬ ┘ê╪╖┘ä╪¿╪º╪¬ ┘ê╪│┘ä╪⌐ ╪¬╪│┘ê┘é ┘ê┘à╪¬╪¼╪▒ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è. ┘à┘å╪º╪│╪¿ ┘ä┘ä┘à╪┤╪º╪▒┘è╪╣ ╪º┘ä╪╡╪║┘è╪▒╪⌐ ┘ê╪º┘ä┘à╪¬┘ê╪│╪╖╪⌐.',
    features: [
      '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬',
      '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
      '╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è',
      '╪│┘ä╪⌐ ╪¬╪│┘ê┘é ╪░┘â┘è╪⌐',
      '┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬',
      '╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐',
      '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘ü╪ª╪º╪¬',
      '╪╡┘ü╪¡╪º╪¬ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬',
      '┘â┘ê╪¿┘ê┘å╪º╪¬ ┘ê╪╣╪▒┘ê╪╢',
      '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪┤╪¡┘å'
    ],
    monthlyPrice: 249,
    yearlyPrice: 2490,
  },
  'store-pro': {
    name: '┘à╪¬╪¼╪▒ ┘à╪º┘â╪│',
    nameEn: 'Store Max',
    description: '┘à╪¬╪¼╪▒ ┘à╪¬┘é╪»┘à: ┘à┘å╪¬╪¼╪º╪¬ ╪║┘è╪▒ ┘à╪¡╪»┘ê╪»╪⌐╪î ┘à╪«╪º╪▓┘å ┘à╪¬╪╣╪»╪»╪⌐╪î ╪¬┘é╪º╪▒┘è╪▒ ┘à╪¬┘é╪»┘à╪⌐ ┘ê┘à┘è╪▓╪º╪¬ ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐ ┘ä┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘à╪¬┘ê╪│╪╖╪⌐ ┘ê╪º┘ä┘â╪¿┘è╪▒╪⌐.',
    features: [
      '┘à┘å╪¬╪¼╪º╪¬ ╪║┘è╪▒ ┘à╪¡╪»┘ê╪»╪⌐',
      '┘à╪«╪º╪▓┘å ┘à╪¬╪╣╪»╪»╪⌐',
      '╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å Real-time',
      '╪¬┘é╪º╪▒┘è╪▒ ┘à╪¬┘é╪»┘à╪⌐',
      '╪¬┘â╪º┘à┘ä ┘à╪╣ WooCommerce',
      '╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪▒╪»┘è┘å',
      '╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪┤╪▒╪º╪í',
      '╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘å┘ü╪º╪» ╪º┘ä┘à╪«╪▓┘ê┘å'
    ],
    monthlyPrice: 499,
    yearlyPrice: 4990,
  },
  'quantity-offers-pro': {
    name: '╪╣╪▒┘ê╪╢ ╪º┘ä┘â┘à┘è╪º╪¬',
    nameEn: 'Quantity Offers Pro',
    description: '╪ú┘å╪┤╪ª ╪╣╪▒┘ê╪╢ ┘â┘à┘è╪º╪¬ ┘à╪¬╪╣╪»╪»╪⌐ ╪º┘ä┘é╪╖╪╣ ┘à╪╣ ╪º╪«╪¬┘è╪º╪▒ ┘à┘é╪º╪│ ╪ú┘ê ┘ä┘ê┘å ┘à╪«╪¬┘ä┘ü ┘ä┘â┘ä ┘é╪╖╪╣╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣┘ä┘ë ╪╡┘ü╪¡╪⌐ ╪º┘ä┘à┘å╪¬╪¼.',
    features: [
      '╪╣╪▒┘ê╪╢ ╪º┘ä┘â┘à┘è╪º╪¬',
      '┘à╪▓╪¼ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬',
      '╪╣╪▒┘ê╪╢ ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ╪º┘ä┘à┘å╪¬╪¼'
    ],
    monthlyPrice: 149,
    yearlyPrice: 1490,
  },
  'commerce-advanced': {
    name: '╪º┘ä┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐',
    nameEn: 'Commerce Advanced',
    description: '╪¬╪¡┘â┘à ┘à╪¬┘é╪»┘à ┘ü┘è ╪º┘ä┘à╪¿┘è╪╣╪º╪¬: ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é╪î ╪Ñ╪┤╪º╪▒╪º╪¬ ╪º┘ä┘à╪«╪▓┘ê┘å╪î ┘ê┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä╪«╪º╪╡╪⌐.',
    features: [
      '╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é',
      '╪Ñ╪┤╪º╪▒╪º╪¬ ╪º┘ä┘à╪«╪▓┘ê┘å',
      '┘à╪│╪º╪▒╪º╪¬ ╪¬┘å┘ü┘è╪░ ╪«╪º╪╡╪⌐'
    ],
    monthlyPrice: 179,
    yearlyPrice: 1790,
  },
  'conversion-suite': {
    name: '╪ú╪»┘ê╪º╪¬ ╪▒┘ü╪╣ ╪º┘ä╪¬╪¡┘ê┘è┘ä',
    nameEn: 'Conversion Suite',
    description: '╪ú╪»┘ê╪º╪¬ ╪▒┘ü╪╣ ╪º┘ä╪¬╪¡┘ê┘è┘ä: ╪╣╪▒┘ê╪╢╪î ┘à╪ñ┘é╪¬╪º╪¬╪î ╪┤╪¡┘å ┘à╪¼╪º┘å┘è╪î ┘ê╪╖╪¿┘é╪º╪¬ ╪Ñ┘é┘å╪º╪╣ ╪»╪º╪«┘ä ╪º┘ä┘à╪¬╪¼╪▒.',
  },
  'ugc-reviews-pro': {
    name: '╪¬┘é┘è┘è┘à╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í',
    nameEn: 'UGC Reviews Pro',
    description: '╪¬┘é┘è┘è┘à╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í ╪¿╪º┘ä╪╡┘ê╪▒ ┘ê╪º┘ä┘ü┘è╪»┘è┘ê ┘à╪╣ ╪┤╪º╪▒╪º╪¬ ╪º┘ä╪½┘é╪⌐.',
  },
  'product-presentations': {
    name: '╪╣╪▒╪╢ ╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘à╪¬╪╣╪»╪»',
    nameEn: 'MultiView - Product Gallery',
    description: '╪╣╪▒╪╢ ╪º┘ä┘à┘å╪¬╪¼ ╪¿╪▓┘ê╪º┘è╪º ┘ê╪╡┘ê╪▒ ┘à╪¬╪╣╪»╪»╪⌐ ╪»╪º╪«┘ä ╪╡┘ü╪¡╪⌐ ╪º┘ä┘à┘å╪¬╪¼.',
  },
};

const LEGACY_SLUGS = ['store', 'ecommerce-basic', 'ecommerce-pro', 'pos-pro'];

const REQUIRED_APPS_REMAP = {
  store: 'store-basic',
  'ecommerce-basic': 'store-basic',
  'ecommerce-pro': 'store-pro',
  'pos-pro': 'store-pro',
};

const INSTALL_MIGRATION = {
  store: 'store-basic',
  'ecommerce-basic': 'store-basic',
  'ecommerce-pro': 'store-pro',
};

const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL', 'active', 'trial'];

function log(...args) {
  console.log(...args);
}

function summary(label, items) {
  log(`  ${label}: ${items.length ? items.join(', ') : 'ΓÇö'}`);
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    log('Γ¥î Could not initialize Prisma client.');
    process.exit(1);
  }
  log(DRY_RUN ? '≡ƒöì DRY-RUN mode ΓÇö no changes will be written.\n' : '≡ƒÜÇ Applying store plan merge migration.\n');

  try {
    // 1) Rename + update kept apps
    const keptSlugs = Object.keys(RENAMES);
    const keptApps = await prisma.marketplaceApp.findMany({
      where: { slug: { in: keptSlugs } },
    });
    const keptBySlug = new Map(keptApps.map((a) => [a.slug, a]));

    const renamed = [];
    for (const slug of keptSlugs) {
      const cfg = RENAMES[slug];
      const existing = keptBySlug.get(slug);
      const payload = {
        name: cfg.name,
        description: cfg.description,
        features: cfg.features,
        monthlyPrice: cfg.monthlyPrice,
        yearlyPrice: cfg.yearlyPrice,
        pricingModel: 'SUBSCRIPTION',
        isActive: true,
        isPublic: true,
        isFeatured: true,
        isPopular: slug === 'store-basic',
        category: 'ECOMMERCE',
        trialDays: 14,
      };
      if (DRY_RUN) {
        renamed.push(`${slug} ΓåÆ "${cfg.name}"`);
        continue;
      }
      if (existing) {
        await prisma.marketplaceApp.update({ where: { id: existing.id }, data: { ...payload, updatedAt: new Date() } });
      } else {
        await prisma.marketplaceApp.create({ data: { slug, ...payload } });
      }
      renamed.push(`${slug} ΓåÆ "${cfg.name}"`);
    }
    summary('Renamed/updated plans', renamed);

    // 2) Deactivate + unpublish legacy apps
    const hidden = [];
    for (const slug of LEGACY_SLUGS) {
      if (DRY_RUN) {
        hidden.push(slug);
        continue;
      }
      const res = await prisma.marketplaceApp.updateMany({
        where: { slug, isActive: true },
        data: { isActive: false, isPublic: false, updatedAt: new Date() },
      });
      if (res.count > 0) hidden.push(slug);
    }
    summary('Deactivated legacy apps', hidden);

    // 3) Remap requiredApps on every app
    const allApps = await prisma.marketplaceApp.findMany({ select: { id: true, slug: true, requiredApps: true } });
    const remapped = [];
    for (const app of allApps) {
      const raw = app.requiredApps;
      const list = Array.isArray(raw) ? raw : [];
      if (list.length === 0) continue;
      const next = list.map((s) => REQUIRED_APPS_REMAP[s] || s);
      const changed = next.length !== list.length || next.some((s, i) => s !== list[i]);
      if (!changed) continue;
      if (DRY_RUN) {
        remapped.push(`${app.slug}: [${list.join(', ')}] ΓåÆ [${next.join(', ')}]`);
        continue;
      }
      await prisma.marketplaceApp.update({
        where: { id: app.id },
        data: { requiredApps: next, updatedAt: new Date() },
      });
      remapped.push(`${app.slug}: [${list.join(', ')}] ΓåÆ [${next.join(', ')}]`);
    }
    summary('Remapped requiredApps', remapped);

    // 4) Migrate installs
    const migrated = [];
    for (const [oldSlug, newSlug] of Object.entries(INSTALL_MIGRATION)) {
      const oldApp = keptBySlug.get(oldSlug);
      if (!oldApp) {
        // old app may exist but wasn't in kept list
        const oldAppRow = await prisma.marketplaceApp.findUnique({ where: { slug: oldSlug } });
        if (!oldAppRow) continue;
        const target = keptBySlug.get(newSlug) || await prisma.marketplaceApp.findUnique({ where: { slug: newSlug } });
        if (!target) continue;

        const installs = await prisma.companyApp.findMany({
          where: { appId: oldAppRow.id, status: { in: ACTIVE_STATUSES } },
        });
        for (const inst of installs) {
          const existing = await prisma.companyApp.findUnique({
            where: { companyId_appId: { companyId: inst.companyId, appId: target.id } },
          });
          if (existing) continue;
          if (DRY_RUN) {
            migrated.push(`${oldSlug}ΓåÆ${newSlug}: company ${inst.companyId}`);
            continue;
          }
          await prisma.companyApp.create({
            data: {
              companyId: inst.companyId,
              appId: target.id,
              activePricingModel: inst.activePricingModel || 'SUBSCRIPTION',
              status: inst.status,
              trialEndsAt: inst.trialEndsAt,
              validUntil: inst.validUntil,
              settings: inst.settings,
            },
          });
          migrated.push(`${oldSlug}ΓåÆ${newSlug}: company ${inst.companyId}`);
        }
      } else {
        const target = keptBySlug.get(newSlug);
        if (!target) continue;
        const installs = await prisma.companyApp.findMany({
          where: { appId: oldApp.id, status: { in: ACTIVE_STATUSES } },
        });
        for (const inst of installs) {
          const existing = await prisma.companyApp.findUnique({
            where: { companyId_appId: { companyId: inst.companyId, appId: target.id } },
          });
          if (existing) continue;
          if (DRY_RUN) {
            migrated.push(`${oldSlug}ΓåÆ${newSlug}: company ${inst.companyId}`);
            continue;
          }
          await prisma.companyApp.create({
            data: {
              companyId: inst.companyId,
              appId: target.id,
              activePricingModel: inst.activePricingModel || 'SUBSCRIPTION',
              status: inst.status,
              trialEndsAt: inst.trialEndsAt,
              validUntil: inst.validUntil,
              settings: inst.settings,
            },
          });
          migrated.push(`${oldSlug}ΓåÆ${newSlug}: company ${inst.companyId}`);
        }
      }
    }
    summary('Migrated installs', migrated);

    log(`\nΓ£à ${DRY_RUN ? 'Dry-run complete ΓÇö no DB changes written.' : 'Migration complete.'}`);
  } catch (error) {
    console.error('Γ¥î Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
