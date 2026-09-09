const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const companyCacheService = require('../services/companyCacheService');

const COMPANY_SELECT = {
  id: true,
  name: true,
  slug: true,
  email: true,
  logo: true,
  currency: true,
  settings: true,
  isActive: true,
};

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

const inferSubdomainSlug = (hostname, configuredMainDomain) => {
  const normalizedHostname = normalizeHostname(hostname);
  const mainDomain = normalizeHostname(configuredMainDomain);

  if (!normalizedHostname || normalizedHostname.startsWith('www.')) {
    return null;
  }

  if (mainDomain) {
    if (
      normalizedHostname === mainDomain ||
      normalizedHostname === `www.${mainDomain}`
    ) {
      return null;
    }

    if (normalizedHostname.endsWith(`.${mainDomain}`)) {
      const prefix = normalizedHostname.slice(0, -(`.${mainDomain}`.length));
      const inferred = prefix.split('.').find((part) => part && part !== 'www');
      return inferred || null;
    }
  }

  const parts = normalizedHostname.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  if (
    parts.length === 3 &&
    parts[1] === 'lvh' &&
    parts[2] === 'me'
  ) {
    return parts[0];
  }

  if (
    parts.length >= 3 &&
    parts[parts.length - 1] === 'localhost'
  ) {
    const inferred = parts.find((part) => part && part !== 'www' && part !== 'localhost');
    return inferred || null;
  }

  if (parts.length >= 3 && !isLocalHostname(normalizedHostname)) {
    return parts[0];
  }

  return null;
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

const extractSubdomainMiddleware = async (req, res, next) => {
  try {
    let company = null;
    let prisma = null;
    const getPrisma = async () => {
      if (!prisma) {
        prisma = await getSharedPrismaClientAsync();
      }

      return prisma;
    };

    // 1️⃣ محاولة استخراج الـ subdomain من header
    const hostHeader = req.headers['x-subdomain'] || req.headers['host'];
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SubdomainMW] Incoming Header:', hostHeader);
    }

    if (hostHeader) {
      // استخراج الـ subdomain
      const hostname = normalizeHostname(hostHeader);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [SubdomainMW] Hostname:', hostname, 'Parts:', hostname.split('.'));
      }

      // 1. محاولة البحث أولاً بالدومين الكامل (Custom Domain)
      // هذا يغطي الحالات مثل my-store.com أو www.my-store.com
      const exactHostname = hostname.startsWith('www.') ? hostname.substring(4) : hostname;

      company = await companyCacheService.getCompanyLookup('customDomain', exactHostname, async () => {
        const prisma = await getPrisma();
        return prisma.company.findUnique({
          where: { customDomain: exactHostname },
          select: COMPANY_SELECT,
        });
      });

      // 2. إذا لم ينجح، جرب الـ Subdomain (Slug)
      if (!company) {
        const mainDomain = process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online';
        const inferredSlug = inferSubdomainSlug(hostname, mainDomain);

        if (inferredSlug) {
          company = await companyCacheService.getCompanyLookup('slug', inferredSlug, async () => {
            const prisma = await getPrisma();
            return prisma.company.findUnique({
              where: { slug: inferredSlug },
              select: COMPANY_SELECT,
            });
          });
        }
      }

      // 2.5️⃣ دعم الـ bare slug المرسل عبر الهيدرز (بدون نقاط)
      // الفرونت بيبعت X-Subdomain / X-Company-Slug بقيمة الـ slug فقط
      // (مثال: "mlabs-kajwal") وهو مينفعش يتُفسّر كـ hostname، فلازم
      // نبحث به مباشرة كسلاگ
      if (!company) {
        const bareSlugCandidates = [
          hostname,
          req.headers['x-company-slug'],
          req.headers['x-company-subdomain'],
        ]
          .map((value) => normalizeHostname(value))
          .filter(
            (value) =>
              value &&
              !value.includes('.') &&
              !isLocalHostname(value) &&
              !value.startsWith('www.')
          );

        for (const slugCandidate of [...new Set(bareSlugCandidates)]) {
          company = await companyCacheService.getCompanyLookup('slug', slugCandidate, async () => {
            const prisma = await getPrisma();
            return prisma.company.findUnique({
              where: { slug: slugCandidate },
              select: COMPANY_SELECT,
            });
          });

          if (company) break;
        }
      }

      if (company && !company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'هذا المتجر غير نشط حالياً'
        });
      }
    }

    // 2️⃣ إذا لم يتم العثور على الشركة من subdomain، جرب query parameter أو header X-Company-Id
    const fallbackCompanyId =
      req.query.companyId ||
      req.headers['x-company-id'] ||
      req.headers['X-Company-Id'];

    if (!company && fallbackCompanyId) {
      // محاولة البحث بالـ ID أولاً (UUID/CUID)
      try {
        company = await companyCacheService.getCompanyLookup('id', fallbackCompanyId, async () => {
          const prisma = await getPrisma();
          return prisma.company.findUnique({
            where: { id: fallbackCompanyId },
            select: COMPANY_SELECT,
          });
        });
      } catch (e) {
        // إذا فشل البحث بالـ ID (كما في حالة إرسال slug كـ ID)، سنحاول بالـ slug أدناه
      }

      // إذا لم ينجح، محاولة البحث كـ slug (مفيد جداً في بيئة التطوير)
      if (!company) {
        company = await companyCacheService.getCompanyLookup('slug', fallbackCompanyId, async () => {
          const prisma = await getPrisma();
          return prisma.company.findUnique({
            where: { slug: fallbackCompanyId },
            select: COMPANY_SELECT,
          });
        });
      }

      if (company && !company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'هذا المتجر غير نشط حالياً'
        });
      }
    }

    // 3️⃣ إضافة معلومات الشركة إلى request وإعداد سياق البيانات (RLS Context)
    if (company) {
      req.company = company;
      req.companyId = company.id;

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
  inferSubdomainSlug
};
