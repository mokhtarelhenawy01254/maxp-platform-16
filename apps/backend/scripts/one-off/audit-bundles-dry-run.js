#!/usr/bin/env node
'use strict';

/**
 * audit-bundles-dry-run.js — Task 621f2800
 *
 * يعرض حالة نظام الباقات قبل أي تنضيف. **لا بيكتب ولا بيحذف أي حاجة.**
 *
 * التشغيل (dry-run افتراضي، القراءة فقط):
 *   node apps/backend/scripts/one-off/audit-bundles-dry-run.js
 *   node apps/backend/scripts/one-off/audit-bundles-dry-run.js --json
 *
 * الخرج:
 *   - عدد صفوف app_bundles (نشطة/موقوفة)
 *   - الـslugs اللي صفحات الهبوط بتشاور عليها (من lpAdminRoutes SEED_PAGES)
 *   - الباقات المفقودة (مشاور عليها ومش موجودة) = خطر 500 في الشاشات
 *   - الباقات اليتيمة (موجودة ومحدش بيشاور عليها) = مرشحة للتنضيف
 *   - عدد صفوف platform_subscriptions (حماية: ممنوع حذف باقة عليها اشتراك نشط)
 *   - عدد صفحات lp_pages اللي فيها bundle_slug
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '../..');

function extractLandingBundleSlugs() {
  const file = path.join(BACKEND_ROOT, 'routes/lpAdminRoutes.js');
  const source = fs.readFileSync(file, 'utf8');
  const slugs = new Set();
  const re = /bundleSlug:\s*'([^']+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    slugs.add(match[1]);
  }
  return Array.from(slugs).sort();
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run (read-only)',
    bundles: { total: 0, active: 0, inactive: 0, slugs: [] },
    landingReferences: { slugs: [], missing: [], orphaned: [] },
    subscriptions: { total: 0, byStatus: {} },
    landingPages: { total: 0, withBundleSlug: 0 },
    destructiveActions: 'none — this script never deletes or updates rows',
  };

  const referenced = extractLandingBundleSlugs();
  report.landingReferences.slugs = referenced;

  let prisma = null;
  try {
    const { getSharedPrismaClient } = require(path.join(BACKEND_ROOT, 'services/sharedDatabase'));
    prisma = getSharedPrismaClient();
  } catch (err) {
    report.error = `تعذّر الاتصال بقاعدة البيانات: ${err.message}`;
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  // 1) الباقات
  const bundles = await prisma.$queryRawUnsafe(
    'SELECT slug, name, "isActive" FROM "app_bundles" ORDER BY slug'
  ).catch(() => []);

  report.bundles.total = bundles.length;
  report.bundles.slugs = bundles.map((b) => b.slug);
  report.bundles.active = bundles.filter((b) => b.isActive !== false).length;
  report.bundles.inactive = report.bundles.total - report.bundles.active;

  const existing = new Set(report.bundles.slugs);
  report.landingReferences.missing = referenced.filter((slug) => !existing.has(slug));
  report.landingReferences.orphaned = report.bundles.slugs.filter((slug) => !referenced.includes(slug));

  // 2) الاشتراكات
  const subs = await prisma.$queryRawUnsafe(
    'SELECT status, COUNT(*)::int AS count FROM "platform_subscriptions" GROUP BY status'
  ).catch(() => []);

  report.subscriptions.byStatus = subs.reduce((acc, row) => {
    acc[row.status] = Number(row.count) || 0;
    report.subscriptions.total += Number(row.count) || 0;
    return acc;
  }, {});

  // 3) صفحات الهبوط المرجعية (العمود مش مضمون في كل البيئات)
  const pageColumns = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'lp_pages' AND column_name = 'bundle_slug'`
  ).catch(() => []);

  const hasBundleSlugColumn = Array.isArray(pageColumns) && pageColumns.length > 0;

  if (hasBundleSlugColumn) {
    const pages = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
              COUNT(NULLIF("bundle_slug", ''))::int AS with_bundle
       FROM "lp_pages"`
    ).catch(() => []);

    if (Array.isArray(pages) && pages[0]) {
      report.landingPages.total = Number(pages[0].total) || 0;
      report.landingPages.withBundleSlug = Number(pages[0].with_bundle) || 0;
    }
  } else {
    report.landingPages.note = 'عمود bundle_slug غير موجود على lp_pages في هذه البيئة — تم تخطي العدّ';
  }

  report.verdict = {
    bundlesReferencedButMissing: report.landingReferences.missing.length,
    orphanBundles: report.landingReferences.orphaned.length,
    safeToCleanCount: report.landingReferences.orphaned.length,
    blockedByActiveSubscriptions: report.subscriptions.byStatus.ACTIVE || 0,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== 621f2800 — dry-run (read-only) ===');
  console.log(`الباقات: ${report.bundles.total} (نشطة ${report.bundles.active} · موقوفة ${report.bundles.inactive})`);
  console.log(`مراجع صفحات الهبوط: ${referenced.length} → مفقودة: ${report.landingReferences.missing.length} · يتيمة: ${report.landingReferences.orphaned.length}`);
  if (report.landingReferences.missing.length) {
    console.log(`  ❌ مفقودة: ${report.landingReferences.missing.join(', ')}`);
  }
  if (report.landingReferences.orphaned.length) {
    console.log(`  🧹 يتيمة: ${report.landingReferences.orphaned.join(', ')}`);
  }
  console.log(`الاشتراكات: ${report.subscriptions.total} — ${JSON.stringify(report.subscriptions.byStatus)}`);
  console.log(`صفحات الهبوط: ${report.landingPages.total} (بها bundle_slug: ${report.landingPages.withBundleSlug})`);
  console.log('مفيش أي كتابة أو حذف في السكربت ده.');
}

main().catch((err) => {
  console.error('audit-bundles-dry-run failed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
