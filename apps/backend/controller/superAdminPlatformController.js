const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/super-admin/platform/marketplace-stats
 * @desc Get marketplace statistics
 * @access Super Admin
 */
exports.getMarketplaceStats = async (req, res) => {
  try {
    // Get app installation stats
    const appStats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId', 'status'],
        _count: true,
        _sum: { totalSpent: true }
      });
    });

    // Get top apps by installations
    const topApps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId'],
        _count: true,
        orderBy: { _count: { appId: 'desc' } },
        take: 10
      });
    });

    // Get app details for top apps
    const appIds = topApps.map(a => a.appId);
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: { id: { in: appIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          monthlyPrice: true,
          installCount: true
        }
      });
    });

    // Get usage revenue
    const usageRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_USAGE',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    // Get subscription revenue
    const subscriptionRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_SUBSCRIPTION',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    res.json({
      success: true,
      data: {
        appStats,
        topApps: topApps.map(ta => ({
          ...ta,
          app: apps.find(a => a.id === ta.appId)
        })),
        usageRevenue: usageRevenue._sum.amount || 0,
        subscriptionRevenue: subscriptionRevenue._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات Marketplace'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/platform/meta-apps
 * @desc جلب قائمة تطبيقات فيسبوك (Primary + Growth) بدون كشف الأسرار
 * @access Super Admin
 */
exports.getMetaApps = async (req, res) => {
  try {
    const metaAppRegistry = require('../services/metaAppRegistryService');
    const apps = await metaAppRegistry.getSafeAppsList();
    return res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    console.error('❌ Error fetching meta apps:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب قائمة تطبيقات فيسبوك',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/super-admin/platform/meta-apps
 * @desc إضافة أو تحديث تطبيق فيسبوك في السجل (Primary أو Growth)
 * @access Super Admin
 */
exports.upsertMetaApp = async (req, res) => {
  try {
    const metaAppRegistry = require('../services/metaAppRegistryService');
    const { key, appId, appSecretRef, configId, webhookVerifyTokenRef, isActive } = req.body || {};

    if (!key || !['primary', 'growth'].includes(String(key).trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'مفتاح التطبيق غير صالح (يجب أن يكون primary أو growth)'
      });
    }

    if (!appId || typeof appId !== 'string' || !appId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'معرّف التطبيق (App ID) مطلوب'
      });
    }

    if (!appSecretRef || typeof appSecretRef !== 'string' || !appSecretRef.trim()) {
      return res.status(400).json({
        success: false,
        message: 'مرجع السر (appSecretRef) مطلوب — ممنوع تخزين السكرت كنص مباشر'
      });
    }

    if (/^[a-f0-9]{32}$/i.test(String(appSecretRef).trim())) {
      return res.status(400).json({
        success: false,
        message: 'ممنوع إدخال سر التطبيق الفعلي كنص خام! يجب إدخال اسم مرجع متغير البيئة (مثل FACEBOOK_APP_SECRET)'
      });
    }

    const updated = await metaAppRegistry.upsertApp({
      key,
      appId,
      appSecretRef,
      configId,
      webhookVerifyTokenRef,
      isActive: isActive !== false
    });

    return res.json({
      success: true,
      message: `تم حفظ تطبيق ${key} بنجاح`,
      data: updated
    });
  } catch (error) {
    console.error('❌ Error upserting meta app:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في حفظ تطبيق فيسبوك',
      error: error.message
    });
  }
};

/**
 * @route PATCH /api/v1/super-admin/platform/meta-apps/:key/toggle
 * @desc تفعيل أو تعطيل تطبيق فيسبوك
 * @access Super Admin
 */
exports.toggleMetaAppStatus = async (req, res) => {
  try {
    const metaAppRegistry = require('../services/metaAppRegistryService');
    const { key } = req.params;
    const { isActive } = req.body || {};

    const normalizedKey = String(key || '').trim().toLowerCase();
    const knownApps = await metaAppRegistry.getAllApps().catch(() => []);
    const knownKeys = (knownApps || []).map((a) => String(a.key || '').toLowerCase());
    if (!normalizedKey || (knownKeys.length && !knownKeys.includes(normalizedKey))) {
      return res.status(400).json({
        success: false,
        message: 'مفتاح التطبيق غير مسجّل في سجل التطبيقات'
      });
    }

    const updated = await metaAppRegistry.toggleAppStatus(normalizedKey, Boolean(isActive));
    return res.json({
      success: true,
      message: `تم ${Boolean(isActive) ? 'تفعيل' : 'تعطيل'} تطبيق ${normalizedKey} بنجاح`,
      data: updated
    });
  } catch (error) {
    console.error('❌ Error toggling meta app status:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تعديل حالة تطبيق فيسبوك',
      error: error.message
    });
  }
};

/**
 * @route PATCH /api/v1/super-admin/platform/meta-apps/:key/default
 * @desc تعيين التطبيق الافتراضي المستخدم عند تسجيل/ربط الشركات الجديدة
 * @access Super Admin
 */
exports.setDefaultMetaApp = async (req, res) => {
  try {
    const metaAppRegistry = require('../services/metaAppRegistryService');
    const { key } = req.params;

    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!normalizedKey) {
      return res.status(400).json({ success: false, message: 'مفتاح التطبيق مطلوب' });
    }

    const result = await metaAppRegistry.setDefaultSignupAppKey(normalizedKey);
    return res.json({
      success: true,
      message: `تم تعيين تطبيق ${normalizedKey} كتطبيق افتراضي للعملاء الجدد`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error setting default meta app:', error);
    return res.status(400).json({
      success: false,
      message: 'فشل في تعيين التطبيق الافتراضي',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/super-admin/platform/meta-apps/:key/test-connection
 * @desc فحص الاتصال بـ Meta وحالة اعتماد الصلاحيات
 * @access Super Admin
 */
exports.testMetaAppConnection = async (req, res) => {
  try {
    const metaAppRegistry = require('../services/metaAppRegistryService');
    const { key } = req.params;
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!['primary', 'growth'].includes(normalizedKey)) {
      return res.status(400).json({
        success: false,
        connected: false,
        message: 'مفتاح التطبيق غير صالح (يجب أن يكون primary أو growth)'
      });
    }
    const result = await metaAppRegistry.testAppConnection(normalizedKey);
    return res.json(result);
  } catch (error) {
    console.error('❌ Error testing meta app connection:', error.message);
    return res.status(500).json({
      success: false,
      connected: false,
      message: 'فشل فحص اتصال تطبيق فيسبوك: ' + error.message
    });
  }
};

module.exports = exports;
