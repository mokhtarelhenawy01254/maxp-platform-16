const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const companyCacheService = require('../services/companyCacheService');

const COMPANY_SELECT = {
  id: true,
  name: true,
  slug: true,
  publicCode: true,
  customDomain: true,
  email: true,
  logo: true,
  currency: true,
  settings: true,
  isActive: true,
};

const PLATFORM_BASE_DOMAINS = new Set([
  'maxp.online',
  'mokhtarelhenawy.online',
]);

const RESERVED_INFRA_SUBDOMAINS = new Set([
  'www',
  'app',
  'admin',
  'api',
  'dev',
  'staging',
  'mail',
]);

const normalizeHostname = (value) =>
  String(value || '').split(':')[0].trim().toLowerCase();

const isLocalHostname = (hostname) =>
  !hostname ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '0.0.0.0' ||
  hostname.endsWith('.localhost') ||
  hostname.endsWith('.lvh.me') ||
  hostname.endsWith('.local') ||
  /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

const isPlatformSubdomainOrApex = (hostname, configuredMainDomain) => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  const baseDomains = new Set(PLATFORM_BASE_DOMAINS);
  const normalizedMain = normalizeHostname(configuredMainDomain);
  if (normalizedMain) {
    baseDomains.add(normalizedMain);
  }

  for (const domain of baseDomains) {
    if (normalized === domain || normalized.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
};

const shouldLookupCustomDomain = (exactHostname, configuredMainDomain) => {
  if (!exactHostname || !exactHostname.includes('.')) {
    return false;
  }
  if (isLocalHostname(exactHostname)) {
    return false;
  }
  if (isPlatformSubdomainOrApex(exactHostname, configuredMainDomain)) {
    return false;
  }
  return true;
};

const inferSubdomainSlug = (hostname, configuredMainDomain) => {
  const normalizedHostname = normalizeHostname(hostname);
  const mainDomain = normalizeHostname(configuredMainDomain);

  if (!normalizedHostname || normalizedHostname.startsWith('www.')) {
    return null;
  }

  const baseDomains = new Set(PLATFORM_BASE_DOMAINS);
  if (mainDomain) {
    baseDomains.add(mainDomain);
  }

  for (const domain of baseDomains) {
    if (
      normalizedHostname === domain ||
      normalizedHostname === `www.${domain}`
    ) {
      return null;
    }
  }

  let candidate = null;

  if (mainDomain && normalizedHostname.endsWith(`.${mainDomain}`)) {
    const prefix = normalizedHostname.slice(0, -(`.${mainDomain}`.length));
    candidate = prefix.split('.').find((part) => part && part !== 'www') || null;
  }

  if (!candidate) {
    for (const domain of baseDomains) {
      if (normalizedHostname.endsWith(`.${domain}`)) {
        const prefix = normalizedHostname.slice(0, -(`.${domain}`.length));
        candidate = prefix.split('.').find((part) => part && part !== 'www') || null;
        break;
      }
    }
  }

  if (!candidate) {
    const parts = normalizedHostname.split('.');
    if (parts.length === 2 && parts[1] === 'localhost') {
      candidate = parts[0];
    } else if (
      parts.length === 3 &&
      parts[1] === 'lvh' &&
      parts[2] === 'me'
    ) {
      candidate = parts[0];
    } else if (
      parts.length >= 3 &&
      parts[parts.length - 1] === 'localhost'
    ) {
      candidate = parts.find((part) => part && part !== 'www' && part !== 'localhost') || null;
    } else if (parts.length >= 3 && !isLocalHostname(normalizedHostname)) {
      candidate = parts[0];
    }
  }

  if (!candidate || RESERVED_INFRA_SUBDOMAINS.has(candidate)) {
    return null;
  }

  return candidate;
};

/**
 * 🔗 Subdomain Middleware - استخراج الشركة من subdomain
 * 
 * يستخدم لتحديد الشركة من الـ subdomain في الـ URL
 * مثال: https://storename.mokhtarelhenawy.online
 * 
 * يقوم بـ:
 * 1. استخراج الـ subdomain من header X-Subdomain
 * 2. البحث عن الشركة في قاعدة البيانات باستخدام slug
 * 3. إضافة معلومات الشركة إلى req.company
 * 4. دعم query parameter كبديل (companyId)
 */

// --- [STORE-SHADOW] Phase 1 Shadow Resolution & Rate-Limited Logger ---
const STORE_SHADOW_CACHE_MAX_ENTRIES = 1000;
const STORE_SHADOW_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const STORE_SHADOW_LOG_INTERVAL_MS = 60 * 1000; // Max 1 log per host per 60s
const storeShadowCache = new Map();

const pruneStoreShadowCacheIfNeeded = () => {
  if (storeShadowCache.size < STORE_SHADOW_CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of storeShadowCache.entries()) {
    if (now - entry.cachedAt > STORE_SHADOW_CACHE_TTL_MS) {
      storeShadowCache.delete(key);
    }
  }
  if (storeShadowCache.size >= STORE_SHADOW_CACHE_MAX_ENTRIES) {
    const keysToDelete = Array.from(storeShadowCache.keys()).slice(0, 200);
    for (const k of keysToDelete) {
      storeShadowCache.delete(k);
    }
  }
};

const resolveStoreShadowAndLog = async (req, company, getPrisma, exactHostname, inferredSlug, matchedBareSlug, mainDomain) => {
  try {
    const rawHostHeader = req.headers['x-subdomain'] || req.headers['host'];
    const hostKey = normalizeHostname(rawHostHeader) || 'unknown';
    const now = Date.now();

    pruneStoreShadowCacheIfNeeded();

    let entry = storeShadowCache.get(hostKey);
    let storeId = null;

    if (entry && (now - entry.cachedAt < STORE_SHADOW_CACHE_TTL_MS)) {
      storeId = entry.storeId;
    } else {
      try {
        const prisma = await getPrisma();
        let store = null;

        // 1. Store.customDomain = normalized hostname (skip for platform subdomains / local / bare slugs)
        if (exactHostname && shouldLookupCustomDomain(exactHostname, mainDomain) && prisma?.store) {
          store = await prisma.store.findUnique({
            where: { customDomain: exactHostname },
            select: { id: true, companyId: true },
          });
        }

        // 2. Otherwise Store.slug = inferred or bare slug or company.slug
        const candidateSlug = inferredSlug || matchedBareSlug || company.slug;
        if (!store && candidateSlug && prisma?.store) {
          store = await prisma.store.findUnique({
            where: { slug: candidateSlug },
            select: { id: true, companyId: true },
          });
        }

        // 3. Verify store.companyId === req.company.id
        if (store && store.companyId === company.id) {
          storeId = store.id;
        } else {
          storeId = 'none';
        }
      } catch (err) {
        // Fallback cleanly if stores table does not exist or query fails
        storeId = 'none';
      }

      if (!entry) {
        entry = { storeId, cachedAt: now, lastLoggedAt: 0 };
        storeShadowCache.set(hostKey, entry);
      } else {
        entry.storeId = storeId;
        entry.cachedAt = now;
      }
    }

    if (!entry.lastLoggedAt || (now - entry.lastLoggedAt >= STORE_SHADOW_LOG_INTERVAL_MS)) {
      entry.lastLoggedAt = now;
      console.log(`[STORE-SHADOW] host=${hostKey} company=${company.id} store=${storeId}`);
    }
  } catch (err) {
    console.warn('⚠️ [STORE-SHADOW] Error in shadow resolution:', err.message);
  }
};

const getHeaderValues = (req, names) => {
  const values = [];
  for (const name of names) {
    const raw = req.headers?.[name];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item !== undefined && item !== null && String(item).trim()) {
          values.push(String(item).trim());
        }
      }
    } else if (raw !== undefined && raw !== null && String(raw).trim()) {
      values.push(String(raw).trim());
    }
  }
  return values;
};

const getParamValues = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .filter((v) => v !== undefined && v !== null && String(v).trim())
      .map((v) => String(v).trim());
  }
  if (raw !== undefined && raw !== null && String(raw).trim()) {
    return [String(raw).trim()];
  }
  return [];
};

const lookupCompanyByCustomDomain = async (exactHostname, getPrisma) => {
  if (!exactHostname) return null;
  return companyCacheService.getCompanyLookup('customDomain', exactHostname, async () => {
    const prisma = await getPrisma();
    return prisma.company.findUnique({
      where: { customDomain: exactHostname },
      select: COMPANY_SELECT,
    });
  });
};

const lookupCompanyBySlug = async (slug, getPrisma) => {
  if (!slug) return null;
  return companyCacheService.getCompanyLookup('slug', slug, async () => {
    const prisma = await getPrisma();
    return prisma.company.findUnique({
      where: { slug },
      select: COMPANY_SELECT,
    });
  });
};

const lookupCompanyByLandingSlug = async (slug, getPrisma) => {
  if (!slug) return null;
  try {
    const prisma = await getPrisma();
    if (typeof prisma?.productLandingPage?.findFirst !== 'function') {
      return null;
    }
    const landing = await prisma.productLandingPage.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { companyId: true },
    });
    if (!landing?.companyId) return null;
    return companyCacheService.getCompanyLookup('id', landing.companyId, async () => {
      return prisma.company.findUnique({
        where: { id: landing.companyId },
        select: COMPANY_SELECT,
      });
    });
  } catch (_) {
    return null;
  }
};

const lookupCompanyById = async (id, getPrisma) => {
  if (!id) return null;
  try {
    return await companyCacheService.getCompanyLookup('id', id, async () => {
      const prisma = await getPrisma();
      return prisma.company.findUnique({
        where: { id },
        select: COMPANY_SELECT,
      });
    });
  } catch (_) {
    return null;
  }
};

const lookupCompanyByPublicCode = async (code, getPrisma) => {
  const trimmed = String(code || '').trim();
  if (!trimmed) return null;
  try {
    const prisma = await getPrisma();
    if (typeof prisma?.company?.findFirst !== 'function') {
      return null;
    }
    return await companyCacheService.getCompanyLookup('publicCode', trimmed.toLowerCase(), async () => {
      return prisma.company.findFirst({
        where: { publicCode: { equals: trimmed, mode: 'insensitive' } },
        select: COMPANY_SELECT,
      });
    });
  } catch (_) {
    return null;
  }
};

const doesSlugHintMatchCompany = (rawHint, hostCompany, hostResolvedLandingSlug, mainDomain) => {
  const normalizedHint = normalizeHostname(rawHint);
  if (!normalizedHint) return true;

  const companySlug = hostCompany.slug ? String(hostCompany.slug).trim().toLowerCase() : null;
  const companyPublicCode = hostCompany.publicCode ? String(hostCompany.publicCode).trim().toLowerCase() : null;
  const companyCustomDomain = hostCompany.customDomain ? normalizeHostname(hostCompany.customDomain) : null;
  const companyCustomDomainBare =
    companyCustomDomain && companyCustomDomain.startsWith('www.')
      ? companyCustomDomain.slice(4)
      : companyCustomDomain;
  const landingSlug = hostResolvedLandingSlug ? String(hostResolvedLandingSlug).trim().toLowerCase() : null;

  if (normalizedHint.includes('.')) {
    const bareHintDomain = normalizedHint.startsWith('www.') ? normalizedHint.slice(4) : normalizedHint;
    if (
      companyCustomDomain &&
      (normalizedHint === companyCustomDomain || bareHintDomain === companyCustomDomainBare)
    ) {
      return true;
    }

    const inferredFromHint = inferSubdomainSlug(normalizedHint, mainDomain);
    if (!inferredFromHint) {
      return false;
    }

    return Boolean(
      (companySlug && inferredFromHint === companySlug) ||
      (landingSlug && inferredFromHint === landingSlug) ||
      (companyPublicCode && inferredFromHint === companyPublicCode)
    );
  }

  return Boolean(
    (companySlug && normalizedHint === companySlug) ||
    (landingSlug && normalizedHint === landingSlug) ||
    (companyPublicCode && normalizedHint === companyPublicCode)
  );
};

const doesIdHintMatchCompany = (rawIdHint, hostCompany) => {
  const trimmed = String(rawIdHint || '').trim();
  if (!trimmed) return true;

  if (trimmed === String(hostCompany.id)) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  if (hostCompany.slug && lower === String(hostCompany.slug).trim().toLowerCase()) {
    return true;
  }
  if (hostCompany.publicCode && lower === String(hostCompany.publicCode).trim().toLowerCase()) {
    return true;
  }

  return false;
};

const extractSubdomainMiddleware = async (req, res, next) => {
  try {
    let company = null;
    let prisma = null;
    let exactHostname = null;
    let inferredSlug = null;
    let matchedBareSlug = null;
    let hostResolvedLandingSlug = null;
    const mainDomain = process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online';
    const getPrisma = async () => {
      if (!prisma) {
        prisma = await getSharedPrismaClientAsync();
      }

      return prisma;
    };

    // Step A: Resolve hostCompany strictly from req.headers['host'] (Host-first priority)
    const rawHostHeader = getHeaderValues(req, ['host', 'Host'])[0] || '';
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SubdomainMW] Incoming Host:', rawHostHeader || '(none)');
    }

    let hostCompany = null;
    if (rawHostHeader) {
      const hostHostname = normalizeHostname(rawHostHeader);
      exactHostname = hostHostname.startsWith('www.') ? hostHostname.slice(4) : hostHostname;

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [SubdomainMW] Hostname:', hostHostname, 'Parts:', hostHostname.split('.'));
      }

      // 1. Custom Domain lookup
      if (shouldLookupCustomDomain(exactHostname, mainDomain)) {
        hostCompany = await lookupCompanyByCustomDomain(exactHostname, getPrisma);
      }

      // 2. Subdomain Slug / Published Landing Page lookup
      if (!hostCompany) {
        inferredSlug = inferSubdomainSlug(hostHostname, mainDomain);
        if (inferredSlug) {
          hostCompany = await lookupCompanyBySlug(inferredSlug, getPrisma);

          if (!hostCompany) {
            hostCompany = await lookupCompanyByLandingSlug(inferredSlug, getPrisma);
            if (hostCompany) {
              hostResolvedLandingSlug = inferredSlug;
              req.inferredLandingSlug = inferredSlug;
            }
          }
        }
      }
    }

    // Step B: Inspect explicit slug hints & explicit ID hints
    const explicitSlugHints = [
      ...getHeaderValues(req, ['x-subdomain', 'X-Subdomain']),
      ...getHeaderValues(req, ['x-company-slug', 'X-Company-Slug']),
      ...getHeaderValues(req, ['x-company-subdomain', 'X-Company-Subdomain']),
    ];

    const explicitIdHints = [
      ...getHeaderValues(req, ['x-company-id', 'X-Company-Id']),
      ...getParamValues(req.query?.companyId),
      ...getParamValues(req.body?.companyId),
    ];

    // Conflict Guard: when Host resolved a company, reject conflicting spoofing headers/params
    if (hostCompany) {
      for (const slugHint of explicitSlugHints) {
        if (!doesSlugHintMatchCompany(slugHint, hostCompany, hostResolvedLandingSlug, mainDomain)) {
          return res.status(403).json({
            success: false,
            code: 'TENANT_HOST_MISMATCH',
            message: 'تعارض في نطاق الشركة المطلوبة',
          });
        }
      }

      for (const idHint of explicitIdHints) {
        if (!doesIdHintMatchCompany(idHint, hostCompany)) {
          return res.status(403).json({
            success: false,
            code: 'TENANT_HOST_MISMATCH',
            message: 'تعارض في معرف الشركة مع النطاق الحالي',
          });
        }
      }

      company = hostCompany;
    }

    // Step C: Fallback when Host does NOT resolve a company (apex, infra, localhost, Capacitor, tests)
    if (!company && explicitSlugHints.length > 0) {
      for (const rawHint of [...new Set(explicitSlugHints)]) {
        const hintNormalized = normalizeHostname(rawHint);
        if (!hintNormalized) continue;

        if (hintNormalized.includes('.')) {
          const hintExact = hintNormalized.startsWith('www.') ? hintNormalized.slice(4) : hintNormalized;
          if (shouldLookupCustomDomain(hintExact, mainDomain)) {
            company = await lookupCompanyByCustomDomain(hintExact, getPrisma);
            if (company) {
              exactHostname = hintExact;
              break;
            }
          }

          const hintInferred = inferSubdomainSlug(hintNormalized, mainDomain);
          if (hintInferred) {
            company = await lookupCompanyBySlug(hintInferred, getPrisma);
            if (company) {
              inferredSlug = hintInferred;
              break;
            }

            company = await lookupCompanyByLandingSlug(hintInferred, getPrisma);
            if (company) {
              inferredSlug = hintInferred;
              req.inferredLandingSlug = hintInferred;
              break;
            }

            company = await lookupCompanyByPublicCode(hintInferred, getPrisma);
            if (company) {
              matchedBareSlug = hintInferred;
              break;
            }
          }
        } else if (
          !isLocalHostname(hintNormalized) &&
          !hintNormalized.startsWith('www.') &&
          !RESERVED_INFRA_SUBDOMAINS.has(hintNormalized)
        ) {
          company = await lookupCompanyBySlug(hintNormalized, getPrisma);
          if (company) {
            matchedBareSlug = hintNormalized;
            break;
          }

          company = await lookupCompanyByLandingSlug(hintNormalized, getPrisma);
          if (company) {
            matchedBareSlug = hintNormalized;
            req.inferredLandingSlug = hintNormalized;
            break;
          }

          company = await lookupCompanyByPublicCode(rawHint, getPrisma);
          if (company) {
            matchedBareSlug = hintNormalized;
            break;
          }
        }
      }
    }

    if (!company) {
      const fallbackCompanyId =
        getParamValues(req.query?.companyId)[0] ||
        getParamValues(req.body?.companyId)[0] ||
        getHeaderValues(req, ['x-company-id', 'X-Company-Id'])[0];

      if (fallbackCompanyId) {
        company = await lookupCompanyById(fallbackCompanyId, getPrisma);

        if (!company) {
          company = await lookupCompanyBySlug(fallbackCompanyId, getPrisma);
        }

        if (!company) {
          company = await lookupCompanyByPublicCode(fallbackCompanyId, getPrisma);
        }
      }
    }

    if (company && !company.isActive) {
      return res.status(403).json({
        success: false,
        message: 'هذا المتجر غير نشط حالياً'
      });
    }

    // 3️⃣ إضافة معلومات الشركة إلى request وإعداد سياق البيانات (RLS Context)
    if (company) {
      req.company = company;
      req.companyId = company.id;

      // [STORE-SHADOW] Shadow resolution & rate-limited log (zero decision alteration)
      await resolveStoreShadowAndLog(req, company, getPrisma, exactHostname, inferredSlug, matchedBareSlug, mainDomain);

      // ✅ تفعيل سياق الشركة لقاعدة البيانات (RLS)
      const tenantContext = require('../services/tenantContext');
      return tenantContext.run(company.id, next);
    }

    next();
  } catch (error) {
    console.error('❌ خطأ في subdomain middleware:', error);
    next(error);
  }
};

/**
 * 🔐 Middleware للتأكد من وجود شركة (مطلوب)
 */
const requireCompany = (req, res, next) => {
  if (!req.company) {
    return res.status(400).json({
      success: false,
      message: 'يجب تحديد المتجر في الـ subdomain أو باستخدام companyId',
      hint: `استخدم https://storename.${process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online'} أو أضف ?companyId=xxx`
    });
  }
  next();
};

module.exports = {
  extractSubdomainMiddleware,
  requireCompany,
  inferSubdomainSlug,
  shouldLookupCustomDomain,
};
