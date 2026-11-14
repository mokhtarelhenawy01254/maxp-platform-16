const sharedDatabase = require('../services/sharedDatabase');

/**
 * Strictly verify that `education-app` (or legacy appId `'education-app'`) is installed
 * and active/non-expired trial for the caller's company.
 * Unlike checkAppAccess, this middleware NEVER auto-installs or auto-creates trial records.
 */
const requireEducationAppInstalled = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = String(req.user.role || '').toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'AI_SERVICE' || req.user.service === true) {
      return next();
    }

    const companyId =
      req.user.effectiveCompanyId ||
      req.user.companyId ||
      (Array.isArray(req.user.userCompanies) ? req.user.userCompanies[0]?.companyId : null);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'APP_ACCESS_DENIED',
        appSlug: 'education-app'
      });
    }

    const prisma = sharedDatabase.getSharedPrismaClient();
    if (!prisma?.companyApp?.findFirst) {
      return res.status(403).json({
        success: false,
        message: 'النظام التعليمي غير مفعل لهذه الشركة',
        code: 'APP_ACCESS_DENIED',
        appSlug: 'education-app'
      });
    }

    const activeApp = await prisma.companyApp.findFirst({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'TRIAL', 'active', 'trial'] },
        OR: [
          { appId: 'education-app' },
          { app: { slug: 'education-app' } }
        ]
      },
      select: {
        id: true,
        status: true,
        trialEndsAt: true
      }
    });

    if (!activeApp) {
      return res.status(403).json({
        success: false,
        message: 'النظام التعليمي غير مفعل لهذه الشركة. يرجى تفعيله من المتجر أولاً.',
        code: 'APP_ACCESS_DENIED',
        appSlug: 'education-app'
      });
    }

    const normalizedStatus = String(activeApp.status || '').toUpperCase();
    if (normalizedStatus === 'TRIAL' && activeApp.trialEndsAt && new Date(activeApp.trialEndsAt) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'انتهت الفترة التجريبية للنظام التعليمي.',
        code: 'APP_ACCESS_DENIED',
        appSlug: 'education-app'
      });
    }

    return next();
  } catch (error) {
    console.error('[EducationAppGate] Error checking installed app:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من تفعيل النظام التعليمي'
    });
  }
};

module.exports = requireEducationAppInstalled;
