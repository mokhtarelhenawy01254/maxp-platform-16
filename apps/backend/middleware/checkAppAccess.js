const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const LEGACY_APP_SLUG_ALIASES = {
  'order-core': ['ecommerce-basic'],
  'order-invoicing': ['ecommerce-basic'],
  // Grandfathering: companies with old monolithic store apps keep access to new granular apps
  'pos-pro': ['ecommerce-pro', 'store-pro', 'ecommerce-basic', 'store-basic'],
  'coupons-pro': ['ecommerce-pro', 'store-pro', 'ecommerce-basic', 'store-basic'],
  'woocommerce-pro': ['ecommerce-pro', 'store-pro', 'ecommerce-basic', 'store-basic'],
  'multi-warehouse-pro': ['ecommerce-pro', 'store-pro', 'inventory-pro'],
  'order-accounting-sources': ['ecommerce-pro', 'store-pro', 'order-source-tracking'],
  // Grandfathering only for monolithic apps that historically included manual orders.
  // order-core / ecommerce-basic / store-basic do NOT open manual orders anymore —
  // manual-orders-pro is now a standalone paid app.
  'manual-orders-pro': ['ecommerce-pro', 'store-pro']
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

      // 🚀 Special check for Turbo: if company has Turbo API key configured or turboEnabled, allow access immediately
      if (appSlug === 'order-shipping-turbo') {
        const company = await executeWithRetry(async () => {
          return await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { turboEnabled: true, turboApiKey: true }
          });
        });
        if (company && (company.turboEnabled || company.turboApiKey)) {
          return next();
        }
      }

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
          if (!matchedApp) {
            matchedApp = candidateApp;
            matchedCompanyApp = companyAppRecord;
          }
          continue;
        }

        // Check trial expiry
        if (companyAppRecord.status === 'TRIAL' && companyAppRecord.trialEndsAt) {
          const now = new Date();
          if (now > companyAppRecord.trialEndsAt) {
            await executeWithRetry(async () => {
              return await getSharedPrismaClient().companyApp.update({
                where: { id: companyAppRecord.id },
                data: { status: 'EXPIRED' }
              });
            });
            if (!matchedApp) {
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
  getCandidateAppSlugs
};
