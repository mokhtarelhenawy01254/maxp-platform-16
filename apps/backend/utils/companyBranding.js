/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2):
 * حلّ هوية العلامة التجارية لكل شركة (الاسم + النطاق) من قاعدة البيانات،
 * مع fallback عام محايد — لا نستخدم اسم/نطاق شركة محددة (multi-tenant).
 *
 * حقول Company المؤكدة (schema.prisma:1900): name, website?, slug?, customDomain?
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // companyId -> { value, expiresAt }

function platformBaseDomain() {
  return process.env.PLATFORM_BASE_DOMAIN || process.env.MAIN_DOMAIN || 'maxp.online';
}

function neutralBranding() {
  return { name: 'Store', domain: platformBaseDomain() };
}

async function getCompanyBranding(companyId) {
  if (!companyId) {
    return neutralBranding();
  }

  const cached = cache.get(companyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let branding = neutralBranding();
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { name: true, slug: true, website: true, customDomain: true },
    });

    if (company) {
      const customDomain = String(company.customDomain || '').trim();
      const websiteHost = company.website
        ? String(company.website).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
        : '';
      branding = {
        name: company.name || 'Store',
        domain: customDomain || websiteHost || `${company.slug || 'store'}.${platformBaseDomain()}`,
      };
    }
  } catch (err) {
    console.error('[COMPANY-BRANDING] Failed to resolve branding:', err.message);
  }

  cache.set(companyId, { value: branding, expiresAt: Date.now() + CACHE_TTL_MS });
  return branding;
}

function clearBrandingCache(companyId) {
  if (companyId) cache.delete(companyId);
  else cache.clear();
}

module.exports = { getCompanyBranding, clearBrandingCache };
