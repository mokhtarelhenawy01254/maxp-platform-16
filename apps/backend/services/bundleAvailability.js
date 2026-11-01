'use strict';

/**
 * حماية قراءة الباقات (AppBundle) — Task 621f2800.
 *
 * الباقة اتشالت كمنتج، فبدل ما أي شاشة تضرب 500 لما الـslug مش موجود،
 * بنحسب حالة مفهومة ونرجّعها (BUNDLE_NOT_FOUND) عشان الواجهة تعرض حالة بدل خطأ.
 *
 * الملف خالص (بدون Prisma) عشان يتست لوحده.
 */

function normalizeSlug(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

/**
 * @param {object} input
 * @param {Array<{slug: string, name?: string, isActive?: boolean}>} input.bundles الباقات الموجودة فعلاً
 * @param {Array<string|null>} input.referencedSlugs الـslugs اللي الكود/الصفحات بتشاور عليها
 * @returns {{available: Array, missing: string[], orphaned: string[], hasMissing: boolean, hasOrphaned: boolean}}
 */
function buildBundleAvailability({ bundles = [], referencedSlugs = [] } = {}) {
  const bundleList = Array.isArray(bundles) ? bundles : [];
  const bySlug = new Map();

  for (const bundle of bundleList) {
    const slug = normalizeSlug(bundle && bundle.slug);
    if (slug) bySlug.set(slug, bundle);
  }

  const referenced = [];
  const seen = new Set();
  for (const raw of Array.isArray(referencedSlugs) ? referencedSlugs : []) {
    const slug = normalizeSlug(raw);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    referenced.push(slug);
  }

  const available = [];
  const missing = [];

  for (const slug of referenced) {
    const bundle = bySlug.get(slug);
    if (!bundle) {
      missing.push(slug);
      continue;
    }
    available.push({
      slug,
      name: bundle.name || null,
      isActive: bundle.isActive !== false,
      // باقة موجودة لكن موقوفة = بتظهر لكن من غير تفعيل
      isAvailable: bundle.isActive !== false,
    });
  }

  const orphaned = Array.from(bySlug.keys()).filter((slug) => !seen.has(slug));

  return {
    available,
    missing,
    orphaned,
    hasMissing: missing.length > 0,
    hasOrphaned: orphaned.length > 0,
  };
}

/**
 * نتيجة جاهزة للـAPI: حالة مفهومة بدل 500.
 */
function describeBundleAvailability(state) {
  const safe = state || { available: [], missing: [], orphaned: [] };

  if (Array.isArray(safe.missing) && safe.missing.length > 0) {
    return {
      ok: false,
      statusCode: 409,
      code: 'BUNDLE_NOT_FOUND',
      message: `الباقة غير متاحة على المنصة (${safe.missing.join(', ')})`,
      missing: safe.missing,
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: null,
    message: null,
    missing: [],
  };
}

module.exports = {
  buildBundleAvailability,
  describeBundleAvailability,
  normalizeSlug,
};
