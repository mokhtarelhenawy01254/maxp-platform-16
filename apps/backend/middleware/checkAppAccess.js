const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const LEGACY_APP_SLUG_ALIASES = {
  'order-core': ['ecommerce-basic'],
  'whatsapp-inbox': ['whatsapp-integration'],
  'whatsapp-routing': ['whatsapp-integration'],
  'whatsapp-templates': ['whatsapp-integration'],
  'whatsapp-notifications': ['whatsapp-integration'],
  'whatsapp-analytics': ['whatsapp-integration'],
  'whatsapp-settings': ['whatsapp-integration'],
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

      // 🚀 Super Company Bypass (ENTERPRISE Plan)
      // If the company is on the ENTERPRISE plan, they get access to EVERYTHING.
      const company = await executeWithRetry(async () => {
        return await getSharedPrismaClient().company.findUnique({
          where: { id: companyId },
          select: { plan: true }
        });
      });

      if (company && company.plan === 'ENTERPRISE') {
        // Bypass all checks for Enterprise plan
        return next();
      }

      // Get the app
      const candidateSlugs = getCandidateAppSlugs(appSlug);
      const app = await executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();

        for (const candidateSlug of candidateSlugs) {
          const candidateApp = await prisma.marketplaceApp.findUnique({
            where: { slug: candidateSlug }
          });

          if (candidateApp) {
            return candidateApp;
          }
        }

        return null;
      });

      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'الأداة غير موجودة'
        });
      }

      // Check if app is installed and active
      const companyApp = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findUnique({
          where: {
            companyId_appId: { companyId, appId: app.id }
          }
        });
      });

      if (!companyApp) {
        return res.status(403).json({
          success: false,
          message: `هذه الميزة تتطلب تفعيل: ${app.name}`,
          needsActivation: true,
          app: {
            slug: app.slug,
            name: app.name,
            icon: app.icon,
            monthlyPrice: app.monthlyPrice,
            pricingModel: app.pricingModel
          }
        });
      }

      // Check if app is active or in trial
      if (!['TRIAL', 'ACTIVE'].includes(companyApp.status)) {
        let message = 'هذه الأداة غير نشطة';

        if (companyApp.status === 'EXPIRED') {
          message = `انتهت صلاحية ${app.name}. يرجى تجديد الاشتراك`;
        } else if (companyApp.status === 'CANCELLED') {
          message = `تم إلغاء ${app.name}. يرجى إعادة التفعيل`;
        } else if (companyApp.status === 'SUSPENDED') {
          message = `تم تعليق ${app.name}. يرجى التواصل مع الدعم`;
        }

        return res.status(403).json({
          success: false,
          message,
          needsRenewal: companyApp.status === 'EXPIRED',
          app: {
            slug: app.slug,
            name: app.name,
            status: companyApp.status
          }
        });
      }

      // Check if trial has ended
      if (companyApp.status === 'TRIAL' && companyApp.trialEndsAt) {
        const now = new Date();
        if (now > companyApp.trialEndsAt) {
          // Update status to expired
          await executeWithRetry(async () => {
            return await getSharedPrismaClient().companyApp.update({
              where: { id: companyApp.id },
              data: { status: 'EXPIRED' }
            });
          });

          return res.status(403).json({
            success: false,
            message: `انتهت الفترة التجريبية لـ ${app.name}. يرجى الترقية للاستمرار`,
            trialEnded: true,
            app: {
              slug: app.slug,
              name: app.name,
              monthlyPrice: app.monthlyPrice
            }
          });
        }
      }

      // Attach app info to request for later use
      req.companyApp = companyApp;
      req.marketplaceApp = app;

      next();
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
