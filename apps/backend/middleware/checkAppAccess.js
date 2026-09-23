const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const STORE_APP_SLUGS = ['store-pro', 'store', 'store-basic', 'ecommerce-basic', 'ecommerce-pro'];
const STORE_CORE_SLUGS = ['ecommerce-basic', 'store-basic', 'store'];

const LEGACY_APP_SLUG_ALIASES = {
  'order-core': [...STORE_CORE_SLUGS, 'pos-pro', 'cafe-restaurant-pro'],
  'order-invoicing': STORE_CORE_SLUGS,
  // Grandfathering: companies with old monolithic store apps keep access to new granular apps
  'pos-pro': STORE_APP_SLUGS,
  'coupons-pro': STORE_APP_SLUGS,
  'woocommerce-pro': STORE_APP_SLUGS,
  'inventory-pro': ['multi-warehouse-pro', ...STORE_APP_SLUGS],
  'multi-warehouse-pro': ['inventory-pro', 'store-pro'],
  'procurement-pro': ['store-pro'],
  'order-accounting-sources': ['store-pro', 'order-source-tracking'],
  // Grandfathering only for monolithic apps that historically included manual orders.
  // order-core / ecommerce-basic / store-basic do NOT open manual orders anymore —
  // manual-orders-pro is now a standalone paid app.
  'manual-orders-pro': ['store-pro'],
  // WhatsApp apps aliases & backwards compatibility:
  'whatsapp-business': ['whatsapp-integration', 'whatsapp-inbox', 'whatsapp-settings', 'whatsapp-notifications', 'whatsapp-templates', 'whatsapp-routing', 'unified-inbox'],
  'whatsapp-integration': ['whatsapp-business', 'whatsapp-inbox', 'whatsapp-settings', 'whatsapp-notifications', 'whatsapp-templates', 'whatsapp-routing', 'unified-inbox'],
  'whatsapp-inbox': ['whatsapp-business', 'whatsapp-integration', 'unified-inbox'],
  'whatsapp-settings': ['whatsapp-business', 'whatsapp-integration'],
  'whatsapp-notifications': ['whatsapp-business', 'whatsapp-integration'],
  'whatsapp-templates': ['whatsapp-business', 'whatsapp-integration'],
  'whatsapp-routing': ['whatsapp-business', 'whatsapp-integration'],
  // Telegram apps aliases:
  'telegram-business': ['telegram-integration', 'telegram'],
  'telegram-integration': ['telegram-business', 'telegram'],
  'telegram': ['telegram-business', 'telegram-integration'],
  // CRM & Marketing aliases:
  'crm-lite': ['crm-basic', 'crm'],
  'crm-basic': ['crm-lite', 'crm'],
  'marketing-agency-pro': ['marketing-agency', 'marketing-sales'],
  'facebook-pages-connect': ['facebook-ads-pro', 'crm-basic', 'crm-lite'],
  // Unified Inbox aliases & backwards compatibility:
  'unified-inbox': [
    'whatsapp-business',
    'whatsapp-integration',
    'whatsapp-inbox',
    'facebook-pages-connect',
    'instagram-business',
    'tiktok-integrations',
    'telegram-business',
    'telegram-integration',
    'crm-lite',
    'crm-basic'
  ],
  // Analytics aliases:
  'orders-analytics': ['analytics-basic', 'analytics-advanced', 'analytics'],
  'analytics-basic': ['orders-analytics', 'analytics-advanced', 'analytics'],
  'analytics-advanced': ['orders-analytics', 'analytics-basic', 'analytics'],
  // Campaign & source attribution aliases:
  'campaign-attribution': [
    'facebook-ads-pro',
    'order-source-tracking',
    'conversion-suite',
    'marketing-agency-pro',
    'analytics-advanced',
    'analytics-basic',
    'orders-analytics',
    'store-pro',
  ],
  // Booking / Services aliases:
  'booking-app': ['service-request-app', 'service-requests'],
  'service-request-app': ['booking-app', 'service-requests'],
  // Shipping multi-carrier hub & carrier aliases:
  'order-shipping-hub': ['order-shipping-turbo', 'order-shipping-bosta', 'order-shipping-qpexpress', 'order-shipping', ...STORE_APP_SLUGS],
  'order-shipping-turbo': ['order-shipping-hub', 'order-shipping', ...STORE_APP_SLUGS],
  'order-shipping-bosta': ['order-shipping-hub', 'order-shipping', ...STORE_APP_SLUGS],
  'order-shipping-qpexpress': ['order-shipping-hub', 'order-shipping', ...STORE_APP_SLUGS],
  'order-shipping': ['order-shipping-hub', 'order-shipping-turbo', 'order-shipping-bosta', 'order-shipping-qpexpress', ...STORE_APP_SLUGS]
};

const getCandidateAppSlugs = (appSlug) => {
  const normalizedSlug = String(appSlug || '').trim();
  const aliases = LEGACY_APP_SLUG_ALIASES[normalizedSlug] || [];
  return [...new Set([normalizedSlug, ...aliases].filter(Boolean))];
};

/**
 * Middleware to check if a company has access to a specific app
 * @param {string} appSlug - The slug of the app to check
 * @returns {Function} Express middleware function
 */
const checkAppAccess = (appSlug) => {
  return async (req, res, next) => {
    try {
      const { companyId } = req.user;

      // 👑 SUPER_ADMIN bypasses all app access checks (no companyId required)
      if (req.user?.role === 'SUPER_ADMIN') {
        return next();
      }

      if (!companyId) {
        return res.status(401).json({
          success: false,
          message: 'غير مصرح لك بالوصول'
        });
      }

      if (req.user?.role === 'AFFILIATE') {
        return res.status(403).json({
          success: false,
          message: 'غير مسموح لك باستخدام هذه الأداة'
        });
      }

      // 🚀 Company level settings & active trial mode check
      const company = await executeWithRetry(async () => {
        return await getSharedPrismaClient().company.findUnique({
          where: { id: companyId },
          select: { trialModeEnabled: true, trialEndsAt: true, turboEnabled: true, turboApiKey: true, bostaApiKey: true, bostaEnabled: true }
        });
      });

      const isShippingApp = ['order-shipping-turbo', 'order-shipping-hub', 'order-shipping', 'order-shipping-bosta', 'order-shipping-qpexpress'].includes(appSlug);
      if (isShippingApp && company && (company.turboEnabled || company.turboApiKey || company.bostaEnabled || company.bostaApiKey)) {
        return next();
      }

      const isCompanyInActiveTrial = Boolean(
        company?.trialModeEnabled &&
        company?.trialEndsAt &&
        new Date() <= new Date(company.trialEndsAt)
      );

      // Find all marketplace apps matching any candidate slug
      const candidateSlugs = getCandidateAppSlugs(appSlug);
      const candidateApps = await executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.marketplaceApp.findMany({
          where: { slug: { in: candidateSlugs } }
        });
      });

      if (candidateApps.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الأداة غير موجودة'
        });
      }

      // Sort: exact match (primary slug) first, then legacy/alias matches
      const primarySlug = String(appSlug || '').trim();
      candidateApps.sort((a, b) => {
        if (a.slug === primarySlug) return -1;
        if (b.slug === primarySlug) return 1;
        return 0;
      });

      // Check if company has ANY of the candidate apps installed and active
      let matchedApp = null;
      let matchedCompanyApp = null;

      for (const candidateApp of candidateApps) {
        const companyAppRecord = await executeWithRetry(async () => {
          return await getSharedPrismaClient().companyApp.findUnique({
            where: {
              companyId_appId: { companyId, appId: candidateApp.id }
            }
          });
        });

        if (!companyAppRecord) {
          continue;
        }

        if (!['TRIAL', 'ACTIVE'].includes(companyAppRecord.status)) {
          // Track the best error to show later (prefer primary app error)
          if (!matchedApp || candidateApp.slug === primarySlug) {
            matchedApp = candidateApp;
            matchedCompanyApp = companyAppRecord;
          }
          continue;
        }

        // Check trial expiry
        if (companyAppRecord.status === 'TRIAL' && companyAppRecord.trialEndsAt) {
          const now = new Date();
          if (now > companyAppRecord.trialEndsAt) {
            // If company itself is still in active company-wide trial, auto-renew trial for this existing active record
            if (isCompanyInActiveTrial && companyAppRecord.status !== 'CANCELLED') {
              const updatedRecord = await executeWithRetry(async () => {
                return await getSharedPrismaClient().companyApp.update({
                  where: { id: companyAppRecord.id },
                  data: {
                    status: 'TRIAL',
                    trialEndsAt: company.trialEndsAt
                  }
                });
              });
              req.companyApp = updatedRecord;
              req.marketplaceApp = candidateApp;
              return next();
            }

            await executeWithRetry(async () => {
              return await getSharedPrismaClient().companyApp.update({
                where: { id: companyAppRecord.id },
                data: { status: 'EXPIRED' }
              });
            });
            if (!matchedApp || candidateApp.slug === primarySlug) {
              matchedApp = candidateApp;
              matchedCompanyApp = { ...companyAppRecord, status: 'EXPIRED' };
            }
            continue;
          }
        }

        // Found a valid app — grant access
        req.companyApp = companyAppRecord;
        req.marketplaceApp = candidateApp;
        return next();
      }

      // 🛡️ Auto-grant if company is in active trial mode.
      // CRITICAL RULES:
      // 1. MUST ONLY apply to the PRIMARY requested app (primarySlug), NEVER to fallback/legacy aliases.
      //    Auto-granting aliases was polluting tenant accounts with legacy monolithic apps (e.g. store-basic).
      // 2. MUST NEVER grant if the user explicitly CANCELLED the app (status === 'CANCELLED').
      //    User cancellation must always be respected!
      if (isCompanyInActiveTrial) {
        const primaryApp = candidateApps.find((a) => a.slug === primarySlug);
        if (primaryApp) {
          const primaryRecord = await executeWithRetry(async () => {
            return await getSharedPrismaClient().companyApp.findUnique({
              where: {
                companyId_appId: { companyId, appId: primaryApp.id }
              }
            });
          });

          // If the user explicitly cancelled this app, respect their choice and do NOT auto-heal!
          if (primaryRecord?.status === 'CANCELLED') {
            return res.status(403).json({
              success: false,
              message: `تم إلغاء تفعيل هذه الأداة (${primaryApp.name}). يمكنك إعادة تفعيلها من متجر التطبيقات.`,
              code: 'APP_CANCELLED',
              appSlug: primarySlug,
              currentStatus: 'CANCELLED'
            });
          }

          if (!primaryRecord || primaryRecord.status === 'EXPIRED') {
            const updatedRecord = await executeWithRetry(async () => {
              return await getSharedPrismaClient().companyApp.upsert({
                where: {
                  companyId_appId: { companyId, appId: primaryApp.id }
                },
                create: {
                  companyId,
                  appId: primaryApp.id,
                  status: 'TRIAL',
                  trialEndsAt: company.trialEndsAt
                },
                update: {
                  status: 'TRIAL',
                  trialEndsAt: company.trialEndsAt
                }
              });
            });
            req.companyApp = updatedRecord;
            req.marketplaceApp = primaryApp;
            return next();
          }
        }
      }

      // No valid app found — return the best error message
      const bestApp = matchedApp || candidateApps[0];
      const bestCompanyApp = matchedCompanyApp;

      if (!bestCompanyApp) {
        return res.status(403).json({
          success: false,
          message: `هذه الميزة تتطلب تفعيل: ${bestApp.name}`,
          needsActivation: true,
          app: {
            slug: bestApp.slug,
            name: bestApp.name,
            icon: bestApp.icon,
            monthlyPrice: bestApp.monthlyPrice,
            pricingModel: bestApp.pricingModel
          }
        });
      }

      if (bestCompanyApp.status === 'EXPIRED') {
        return res.status(403).json({
          success: false,
          message: bestCompanyApp.trialEndsAt ? `انتهت الفترة التجريبية لـ ${bestApp.name}. يرجى الترقية للاستمرار` : `انتهت صلاحية ${bestApp.name}. يرجى تجديد الاشتراك`,
          needsRenewal: true,
          trialEnded: !!bestCompanyApp.trialEndsAt,
          app: {
            slug: bestApp.slug,
            name: bestApp.name,
            status: bestCompanyApp.status
          }
        });
      }

      let message = 'هذه الأداة غير نشطة';
      if (bestCompanyApp.status === 'CANCELLED') {
        message = `تم إلغاء ${bestApp.name}. يرجى إعادة التفعيل`;
      } else if (bestCompanyApp.status === 'SUSPENDED') {
        message = `تم تعليق ${bestApp.name}. يرجى التواصل مع الدعم`;
      }

      return res.status(403).json({
        success: false,
        message,
        needsRenewal: false,
        app: {
          slug: bestApp.slug,
          name: bestApp.name,
          status: bestCompanyApp.status
        }
      });
    } catch (error) {
      console.error('Error checking app access:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحيات',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check if company has sufficient wallet balance
 * @param {number} minBalance - Minimum required balance
 * @returns {Function} Express middleware function
 */
const checkWalletBalance = (minBalance = 0) => {
  return async (req, res, next) => {
    try {
      const { companyId } = req.user;

      const wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      if (!wallet || parseFloat(wallet.balance) < minBalance) {
        return res.status(402).json({
          success: false,
          message: 'رصيد المحفظة غير كافي',
          needsRecharge: true,
          currentBalance: wallet ? parseFloat(wallet.balance) : 0,
          requiredBalance: minBalance
        });
      }

      req.wallet = wallet;
      next();
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من رصيد المحفظة',
        error: error.message
      });
    }
  };
};

module.exports = {
  checkAppAccess,
  checkWalletBalance,
  getCandidateAppSlugs,
  STORE_APP_SLUGS,
  LEGACY_APP_SLUG_ALIASES
};
