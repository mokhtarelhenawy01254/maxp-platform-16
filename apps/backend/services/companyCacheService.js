/**
 * Company Lookup Cache Service
 *
 * 🔄 يقلل استعلامات `company.findUnique` المتكررة في subdomain middleware —
 * البيانات شبه ثابتة، وكل طلب عام بيعمل لحد 4 استعلامات لنفس الشركة.
 * بـ TTL قصير (افتراضي 60 ثانية) مع invalidation مركزي في sharedDatabase
 * عند أي `company.update` — فلا خطر بيانات قديمة (stale) مطوّل.
 *
 * الأمان: نفس كائن الشركة اللي بييجي من DB بالظبط (نفس SELECT) — مفيش أي
 * تعديل على الـ fields أو منطق الـ RLS.
 */

const redisCacheService = require('./redisCacheService');

const COMPANY_CACHE_TTL = Number(
  process.env.COMPANY_CACHE_TTL_SECONDS || 60
);

/**
 * مفتاح cache موحّد حسب نوع البحث
 */
function companyLookupKey(type, value) {
  return `company:lookup:${type}:${String(value || '').toLowerCase()}`;
}

/**
 * مفتاح فهرس عكسي: companyId → قائمة المفاتيح اللي اتحطت له
 * (عشان الـ invalidation يقدر يمسح كل المفاتيح حتى لو غير معروف نوعها)
 */
function companyIndexKey(companyId) {
  return `company:index:${companyId}`;
}

/**
 * جلب الشركة مع cache — لو مش موجود يتنفّذ fetchFn ويخزّن النتيجة
 * @param {string} type  customDomain | slug | id
 * @param {string} value قيمة البحث
 * @param {() => Promise<any>} fetchFn الجالب الأصلي من DB
 */
async function getCompanyLookup(type, value, fetchFn) {
  const key = companyLookupKey(type, value);
  const cached = await redisCacheService.get(key);
  if (cached) return cached;

  const company = await fetchFn();
  if (company && company.id) {
    await redisCacheService.set(key, company, COMPANY_CACHE_TTL);

    // فهرس عكسي للـ invalidation
    const indexKey = companyIndexKey(company.id);
    const existing = (await redisCacheService.get(indexKey)) || [];
    if (!existing.includes(key)) {
      existing.push(key);
      await redisCacheService.set(indexKey, existing, COMPANY_CACHE_TTL * 10);
    }
  }
  return company;
}

/**
 * إبطال cache شركة (بعد أي update)
 * @param {string|null} companyId id الشركة
 * @param {string[]} [extraKeys] مفاتيح إضافية تُمسح (مثل slug/domain قديم)
 */
async function invalidateCompanyCache(companyId, extraKeys = []) {
  const toDelete = new Set(extraKeys);

  if (companyId) {
    const indexKey = companyIndexKey(companyId);
    const keys = (await redisCacheService.get(indexKey)) || [];
    for (const k of keys) toDelete.add(k);
    toDelete.add(indexKey);
  }

  for (const k of toDelete) {
    if (k) {
      await redisCacheService.del(k).catch(() => {});
    }
  }
}

module.exports = {
  getCompanyLookup,
  invalidateCompanyCache,
  companyLookupKey,
  companyIndexKey,
};