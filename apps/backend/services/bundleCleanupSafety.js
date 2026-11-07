'use strict';

/**
 * حساب أمان حذف الباقات — Task 621f2800.
 *
 * دوال خالصة (بدون Prisma) عشان تتست لوحدها. الهدف: باقة يتيمة ما تتعلّمهاش
 * «آمنة للحذف» غير لما نكون قادرين نثبت إن مفيش شركة عليها اشتراك نشط
 * بتستخدم أي تطبيق من تطبيقاتها. أي metadata مش سليمة = مش آمنة (fail-closed).
 */

/**
 * @param {unknown} raw قيمة appIds من قاعدة البيانات (JSONB أو نص JSON)
 * @returns {{slugs: string[], valid: boolean, issue: string|null}}
 */
function normalizeAppIds(raw) {
  if (raw === null || raw === undefined) {
    return { slugs: [], valid: false, issue: 'appIds missing' };
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { slugs: [], valid: false, issue: 'appIds empty' };
    const invalid = raw.some((v) => typeof v !== 'string' || v.trim() === '');
    if (invalid) return { slugs: [], valid: false, issue: 'appIds contains non-string entry' };
    return { slugs: raw.map((v) => v.trim()), valid: true, issue: null };
  }
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text === '') return { slugs: [], valid: false, issue: 'appIds empty string' };
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { slugs: [], valid: false, issue: 'appIds is not an array' };
      }
      if (parsed.length === 0) return { slugs: [], valid: false, issue: 'appIds empty' };
      const invalid = parsed.some((v) => typeof v !== 'string' || v.trim() === '');
      if (invalid) return { slugs: [], valid: false, issue: 'appIds contains non-string entry' };
      return { slugs: parsed.map((v) => v.trim()), valid: true, issue: null };
    } catch (err) {
      return { slugs: [], valid: false, issue: 'appIds malformed JSON' };
    }
  }
  return { slugs: [], valid: false, issue: 'appIds has unsupported type' };
}

/**
 * @param {object} input
 * @param {Array<{slug: string, appIds: unknown}>} input.bundles
 * @param {Array<string>} input.referencedSlugs
 * @param {Array<string>} input.activeCompanyIds شركات عليها اشتراك ACTIVE/TRIAL
 * @param {Map<string, Set<string>>} input.appsByCompany slug التطبيقات النشطة لكل شركة
 * @param {Map<string, string>} input.slugById تحويل id التطبيق إلى slug
 * @returns {Array<{slug, orphaned, activeSubscriberCompanies, safeToClean, metadataIssue}>}
 */
function computeBundleSafety({ bundles = [], referencedSlugs = [], activeCompanyIds = [], appsByCompany = new Map(), slugById = new Map() }) {
  const referenced = new Set(referencedSlugs);
  return bundles.map((bundle) => {
    const normalized = normalizeAppIds(bundle.appIds);
    const resolvedSlugs = new Set(normalized.slugs.map((raw) => slugById.get(raw) || raw));

    let subscriberCompanies = 0;
    if (normalized.valid) {
      for (const cid of activeCompanyIds) {
        const owned = appsByCompany.get(String(cid));
        if (!owned) continue;
        for (const slug of owned) {
          if (resolvedSlugs.has(slug)) {
            subscriberCompanies += 1;
            break;
          }
        }
      }
    }

    const orphaned = !referenced.has(String(bundle.slug));
    const metadataIssue = normalized.valid ? null : normalized.issue;
    return {
      slug: bundle.slug,
      orphaned,
      activeSubscriberCompanies: subscriberCompanies,
      safeToClean: orphaned && normalized.valid && subscriberCompanies === 0,
      metadataIssue,
    };
  });
}

module.exports = { normalizeAppIds, computeBundleSafety };
