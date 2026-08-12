#!/usr/bin/env node
/**
 * Migration: Restructure ECOMMERCE store plans (2026).
 *
 * Target customer-facing structure:
 *   1. متجر بلس (store-basic)    249 EGP/mo  — basic plan
 *   2. متجر برو (store-pro)      499 EGP/mo  — pro plan
 *   3. عروض الكميات (quantity-offers-pro) 149 EGP/mo — add-on
 *   4. المبيعات المتقدمة (commerce-advanced) 179 EGP/mo — add-on
 *   Removed: نظام POS (pos-pro)
 *
 * This script:
 *   - Renames display metadata for the 4 kept apps (slug stays → installs preserved).
 *   - Deactivates + unpublishes legacy apps: store, ecommerce-basic, ecommerce-pro, pos-pro.
 *   - Migrates companyApp installs: store/ecommerce-basic → store-basic, ecommerce-pro → store-pro.
 *   - Remaps requiredApps arrays across all marketplace_apps:
 *       store → store-basic, ecommerce-basic → store-basic, ecommerce-pro → store-pro
 *
 * Usage:
 *   node scripts/merge_store_plans_2026.js [--dry-run]
 */
const { getSharedPrismaClientAsync, executeWithRetry } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

const RENAMES = {
  'store-basic': {
    name: 'المتجر',
    nameEn: 'Store',
    description: 'متجر إلكتروني كامل: منتجات وطلبات وسلة تسوق ومتجر إلكتروني. مناسب للمشاريع الصغيرة والمتوسطة.',
    features: [
      'إدارة الطلبات',
      'إدارة المنتجات',
      'المتجر الإلكتروني',
      'سلة تسوق ذكية',
      'معالجة الطلبات',
      'تقارير المبيعات الأساسية',
      'إدارة الفئات',
      'صفحات المنتجات',
      'كوبونات وعروض',
      'إدارة الشحن'
    ],
    monthlyPrice: 249,
    yearlyPrice: 2490,
  },
  'store-pro': {
    name: 'متجر ماكس',
    nameEn: 'Store Max',
    description: 'متجر متقدم: منتجات غير محدودة، مخازن متعددة، تقارير متقدمة وميزات احترافية للشركات المتوسطة والكبيرة.',
    features: [
      'منتجات غير محدودة',
      'مخازن متعددة',
      'تتبع المخزون Real-time',
      'تقارير متقدمة',
      'تكامل مع WooCommerce',
      'إدارة الموردين',
      'طلبات الشراء',
      'إشعارات نفاد المخزون'
    ],
    monthlyPrice: 499,
    yearlyPrice: 4990,
  },
  'quantity-offers-pro': {
    name: 'عروض الكميات',
    nameEn: 'Quantity Offers Pro',
    description: 'أنشئ عروض كميات متعددة القطع مع اختيار مقاس أو لون مختلف لكل قطعة مباشرة على صفحة المنتج.',
    features: [
      'عروض الكميات',
      'مزج المتغيرات',
      'عروض على مستوى المنتج'
    ],
    monthlyPrice: 149,
    yearlyPrice: 1490,
  },
  'commerce-advanced': {
    name: 'المبيعات المتقدمة',
    nameEn: 'Commerce Advanced',
    description: 'تحكم متقدم في المبيعات: الطلب المسبق، إشارات المخزون، ومسارات التنفيذ الخاصة.',
    features: [
      'الطلب المسبق',
      'إشارات المخزون',
      'مسارات تنفيذ خاصة'
    ],
    monthlyPrice: 179,
    yearlyPrice: 1790,
  },
  'conversion-suite': {
    name: 'أدوات رفع التحويل',
    nameEn: 'Conversion Suite',
    description: 'أدوات رفع التحويل: عروض، مؤقتات، شحن مجاني، وطبقات إقناع داخل المتجر.',
  },
  'ugc-reviews-pro': {
    name: 'تقييمات العملاء',
    nameEn: 'UGC Reviews Pro',
    description: 'تقييمات العملاء بالصور والفيديو مع شارات الثقة.',
  },
  'product-presentations': {
    name: 'عرض المنتج المتعدد',
    nameEn: 'MultiView - Product Gallery',
    description: 'عرض المنتج بزوايا وصور متعددة داخل صفحة المنتج.',
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
  log(`  ${label}: ${items.length ? items.join(', ') : '—'}`);
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    log('❌ Could not initialize Prisma client.');
    process.exit(1);
  }
  log(DRY_RUN ? '🔍 DRY-RUN mode — no changes will be written.\n' : '🚀 Applying store plan merge migration.\n');

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
        renamed.push(`${slug} → "${cfg.name}"`);
        continue;
      }
      if (existing) {
        await prisma.marketplaceApp.update({ where: { id: existing.id }, data: { ...payload, updatedAt: new Date() } });
      } else {
        await prisma.marketplaceApp.create({ data: { slug, ...payload } });
      }
      renamed.push(`${slug} → "${cfg.name}"`);
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
        remapped.push(`${app.slug}: [${list.join(', ')}] → [${next.join(', ')}]`);
        continue;
      }
      await prisma.marketplaceApp.update({
        where: { id: app.id },
        data: { requiredApps: next, updatedAt: new Date() },
      });
      remapped.push(`${app.slug}: [${list.join(', ')}] → [${next.join(', ')}]`);
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
            migrated.push(`${oldSlug}→${newSlug}: company ${inst.companyId}`);
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
          migrated.push(`${oldSlug}→${newSlug}: company ${inst.companyId}`);
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
            migrated.push(`${oldSlug}→${newSlug}: company ${inst.companyId}`);
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
          migrated.push(`${oldSlug}→${newSlug}: company ${inst.companyId}`);
        }
      }
    }
    summary('Migrated installs', migrated);

    log(`\n✅ ${DRY_RUN ? 'Dry-run complete — no DB changes written.' : 'Migration complete.'}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
