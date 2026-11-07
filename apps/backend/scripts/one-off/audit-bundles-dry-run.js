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
 *   - عدد صفحات lp_pages اللي فيها bundleSlug (أو bundle_slug في المخططات القديمة)
 *   - لكل باقة يتيمة: عدد الشركات اللي عليها اشتراك نشط وبتستخدم أي تطبيق من تطبيقاتها
 *     → الباقة تتحسب safeToClean **بس** لو العدد ده صفر.
 *
 * أي فشل في أي استعلام = خروج بكود 1 مع رسالة واضحة (fail-closed) — ممنوع
 * ما نعرضش صفر كأنه نتيجة ناجحة.
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

const { computeBundleSafety } = require(path.join(BACKEND_ROOT, 'services/bundleCleanupSafety'));

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run (read-only)',
    bundles: { total: 0, active: 0, inactive: 0, slugs: [] },
    landingReferences: { slugs: [], missing: [], orphaned: [] },
    subscriptions: { total: 0, byStatus: {}, activeCompanies: 0 },
    landingPages: { total: 0, withBundleSlug: 0 },
    bundleSafety: [],
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

  // أي فشل قراءة يتوقف فورًا — ممنوع .catch(() => []) لأنه بيحوّل الأعطال لأصفار كاذبة
  const query = async (label, sql) => {
    try {
      const rows = await prisma.$queryRawUnsafe(sql);
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      throw new Error(`${label}: ${err.message}`);
    }
  };

  // 1) الباقات
  const bundles = await query(
    'app_bundles',
    'SELECT id, slug, name, "isActive", "appIds" FROM "app_bundles" ORDER BY slug'
  );

  report.bundles.total = bundles.length;
  report.bundles.slugs = bundles.map((b) => b.slug);
  report.bundles.active = bundles.filter((b) => b.isActive !== false).length;
  report.bundles.inactive = report.bundles.total - report.bundles.active;

  const existing = new Set(report.bundles.slugs);
  report.landingReferences.missing = referenced.filter((slug) => !existing.has(slug));
  report.landingReferences.orphaned = report.bundles.slugs.filter((slug) => !referenced.includes(slug));

  // 2) الاشتراكات — الحالة NULL بتظهر صريحة بدل ما تتوه في التجميع
  const subs = await query(
    'platform_subscriptions',
    `SELECT COALESCE("status"::text, 'NULL') AS status, COUNT(*)::int AS count
     FROM "platform_subscriptions"
     GROUP BY 1
     ORDER BY 1`
  );

  report.subscriptions.byStatus = subs.reduce((acc, row) => {
    acc[row.status] = Number(row.count) || 0;
    report.subscriptions.total += Number(row.count) || 0;
    return acc;
  }, {});

  const rawSubTotal = await query(
    'platform_subscriptions total',
    'SELECT COUNT(*)::int AS total FROM "platform_subscriptions"'
  );

  const totalRows = rawSubTotal[0] ? Number(rawSubTotal[0].total) || 0 : 0;
  report.subscriptions.rowsInTable = totalRows;
  report.subscriptions.unaccounted = totalRows - report.subscriptions.total;

  // 3) الشركات اللي عليها اشتراك نشط/تجريبي (حماية الباقات)
  const activeSubCompanies = await query(
    'active subscriptions companies',
    `SELECT DISTINCT "companyId" FROM "platform_subscriptions"
     WHERE "status"::text IN ('ACTIVE', 'TRIAL')`
  );
  const activeCompanyIds = activeSubCompanies.map((r) => String(r.companyId));
  report.subscriptions.activeCompanies = activeCompanyIds.length;

  // 4) تطبيقات الشركات النشطة (لربط الباقة بأصحابها الفعليين)
  const appRows = await query(
    'marketplace_apps',
    'SELECT id, slug FROM "marketplace_apps"'
  );
  const slugById = new Map(appRows.map((a) => [String(a.id), String(a.slug)]));

  let activeCompanyApps = [];
  if (activeCompanyIds.length > 0) {
    activeCompanyApps = await query(
      'company_apps',
      `SELECT ca."companyId", a.slug
       FROM "company_apps" ca
       JOIN "marketplace_apps" a ON a.id = ca."appId"
       WHERE ca."status" = 'ACTIVE'
         AND ca."companyId" = ANY(ARRAY[${activeCompanyIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}]::text[])`
    );
  }
  const appsByCompany = new Map();
  for (const row of activeCompanyApps) {
    const cid = String(row.companyId);
    if (!appsByCompany.has(cid)) appsByCompany.set(cid, new Set());
    appsByCompany.get(cid).add(String(row.slug));
  }

  // 5) لكل باقة: كام شركة نشطة بتستخدم أي تطبيق من تطبيقاتها
  report.bundleSafety = computeBundleSafety({
    bundles,
    referencedSlugs: referenced,
    activeCompanyIds,
    appsByCompany,
    slugById,
  });

  // 6) صفحات الهبوط المرجعية — العمود اسمه "bundleSlug" في المخطط الحالي وbundle_slug في القديم
  const pageColumns = await query(
    'lp_pages columns',
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'lp_pages' AND column_name IN ('bundle_slug', 'bundleSlug')`
  );

  const columnName = pageColumns.map((r) => r.column_name).find((name) => name === 'bundle_slug' || name === 'bundleSlug');
  if (columnName) {
    const quoted = `"${columnName}"`;
    const pages = await query(
      'lp_pages counts',
      `SELECT COUNT(*)::int AS total,
              COUNT(NULLIF(${quoted}, ''))::int AS with_bundle
       FROM "lp_pages"`
    );
    report.landingPages.column = columnName;
    if (pages[0]) {
      report.landingPages.total = Number(pages[0].total) || 0;
      report.landingPages.withBundleSlug = Number(pages[0].with_bundle) || 0;
    }
  } else {
    report.landingPages.note = 'عمود bundleSlug/bundle_slug غير موجود على lp_pages — تم تخطي العدّ';
  }

  report.verdict = {
    bundlesReferencedButMissing: report.landingReferences.missing.length,
    orphanBundles: report.landingReferences.orphaned.length,
    safeToCleanCount: report.bundleSafety.filter((b) => b.safeToClean).length,
    blockedByActiveSubscriptions: report.subscriptions.byStatus.ACTIVE || 0,
    bundlesWithActiveSubscribers: report.bundleSafety.filter((b) => b.activeSubscriberCompanies > 0).length,
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
  console.log(`الاشتراكات: ${report.subscriptions.total} — ${JSON.stringify(report.subscriptions.byStatus)} · شركات نشطة: ${report.subscriptions.activeCompanies}`);
  if (report.subscriptions.rowsInTable !== undefined) {
    console.log(`صفوف الجدول: ${report.subscriptions.rowsInTable} · غير محسوب: ${report.subscriptions.unaccounted}`);
  }
  console.log(`صفحات الهبوط: ${report.landingPages.total} (بها ${report.landingPages.column || 'bundleSlug'}: ${report.landingPages.withBundleSlug})`);
  for (const b of report.bundleSafety) {
    console.log(`  - ${b.slug}: orphan=${b.orphaned} · شركات نشطة=${b.activeSubscriberCompanies} · safe=${b.safeToClean}`);
  }
  console.log('مفيش أي كتابة أو حذف في السكربت ده.');
}

main().catch((err) => {
  console.error('audit-bundles-dry-run failed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
