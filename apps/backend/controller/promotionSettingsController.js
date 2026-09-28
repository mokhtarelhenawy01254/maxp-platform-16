const { safeQuery, initializeSharedDatabase } = require('../services/sharedDatabase');
const redisCacheService = require('../services/redisCacheService');

function isPrismaConnectionError(error) {
  const msg = String(error?.message || '');
  return msg.includes('Engine is not yet connected') ||
    msg.includes('Response from the Engine was empty') ||
    msg.includes('PrismaClientInitializationError') ||
    msg.includes('PrismaClientRustPanicError') ||
    (typeof error?.code === 'string' && error.code.startsWith('P1'));
}

async function safePromotionQuery(operation, label = 'unknown') {
  try {
    return await safeQuery(operation);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn(`⚠️ [PROMOTION-SETTINGS] Prisma connection error (${label}). Reinitializing and retrying...`);
      await initializeSharedDatabase();
      return await safeQuery(operation);
    }
    throw error;
  }
}

/**
 * مزامنة إعدادات الشحن المجاني مع تطبيق conversion-suite وأداة freeShippingBar
 */
async function syncConversionSuiteWithPromotionSettings(p, companyId, { freeShippingEnabled, freeShippingThreshold }) {
  try {
    const conversionApp = await p.companyApp.findFirst({
      where: {
        companyId,
        app: { slug: 'conversion-suite' }
      },
      include: { app: true }
    });

    if (conversionApp) {
      let appSettings = conversionApp.settings || {};
      if (typeof appSettings === 'string') {
        try { appSettings = JSON.parse(appSettings); } catch { appSettings = {}; }
      }
      appSettings = { ...appSettings };
      appSettings.modules = { ...(appSettings.modules || {}) };
      appSettings.thresholds = { ...(appSettings.thresholds || {}) };
      appSettings.copy = { ...(appSettings.copy || {}) };

      if (freeShippingEnabled !== undefined) {
        appSettings.modules.freeShippingBar = Boolean(freeShippingEnabled);
      }
      if (freeShippingThreshold !== undefined) {
        appSettings.thresholds.freeShippingAmount = parseFloat(freeShippingThreshold) || 0;
      }

      // Ensure Arabic copy
      if (!appSettings.copy.freeShippingMessage || appSettings.copy.freeShippingMessage === 'Add {{remaining}} to unlock free shipping') {
        appSettings.copy.freeShippingMessage = 'أضف {{remaining}} للحصول على شحن مجاني';
      }
      if (!appSettings.copy.freeShippingReachedMessage || appSettings.copy.freeShippingReachedMessage === 'You unlocked free shipping') {
        appSettings.copy.freeShippingReachedMessage = 'مبروك! تم تفعيل الشحن المجاني';
      }

      await p.companyApp.update({
        where: { id: conversionApp.id },
        data: { settings: appSettings }
      });
      console.log(`✅ [PROMOTION-SETTINGS] Synced conversion-suite for company ${companyId}: freeShippingBar=${appSettings.modules.freeShippingBar}, threshold=${appSettings.thresholds.freeShippingAmount}`);
    } else {
      const app = await p.app.findUnique({ where: { slug: 'conversion-suite' } });
      if (app) {
        await p.companyApp.create({
          data: {
            companyId,
            appId: app.id,
            status: 'ACTIVE',
            settings: {
              general: { enabled: true, renderInTemplates: true, attachToThemeShell: true, preset: 'balanced' },
              modules: { freeShippingBar: Boolean(freeShippingEnabled) },
              thresholds: { freeShippingAmount: parseFloat(freeShippingThreshold) || 0 },
              copy: {
                freeShippingMessage: 'أضف {{remaining}} للحصول على شحن مجاني',
                freeShippingReachedMessage: 'مبروك! تم تفعيل الشحن المجاني'
              }
            }
          }
        });
        console.log(`✅ [PROMOTION-SETTINGS] Created and activated conversion-suite for company ${companyId}`);
      }
    }

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (cacheErr) {
      console.warn('⚠️ [REDIS] Error deleting storefront settings cache:', cacheErr);
    }
  } catch (syncErr) {
    console.error('⚠️ [PROMOTION-SETTINGS] Failed to sync conversion-suite:', syncErr);
  }
}

/**
 * 🎯 Controller لإدارة إعدادات الترويج (الشحن المجاني)
 */

/**
 * جلب إعدادات الترويج للشركة
 * GET /api/promotion-settings
 */
exports.getPromotionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    console.log('🔍 [PROMOTION-SETTINGS] Getting settings for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // البحث عن الإعدادات
    let settings = await safePromotionQuery(
      (p) => p.storePromotionSettings.findUnique({ where: { companyId } }),
      'findUnique'
    ).catch(err => {
      console.error('❌ [PROMOTION-SETTINGS] Error finding settings:', err);
      throw err;
    });

    console.log('📊 [PROMOTION-SETTINGS] Found settings:', settings ? 'Yes' : 'No');

    // إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
    if (!settings) {
      console.log('🔨 [PROMOTION-SETTINGS] Creating default settings...');
      settings = await safePromotionQuery(
        (p) => p.storePromotionSettings.create({
          data: {
            companyId,
            freeShippingEnabled: false,
            freeShippingThreshold: 0,
            freeShippingMessage: 'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر',
            flatShippingEnabled: false,
            flatShippingFee: 0
          }
        }),
        'create'
      ).catch(err => {
        console.error('❌ [PROMOTION-SETTINGS] Error creating settings:', err);
        throw err;
      });
      console.log('✅ [PROMOTION-SETTINGS] Created settings:', settings.id);
    }

    // Auto-heal drift: sync conversion-suite if free shipping is active
    if (settings && (settings.freeShippingEnabled || settings.freeShippingThreshold > 0)) {
      safePromotionQuery(
        (p) => syncConversionSuiteWithPromotionSettings(p, companyId, {
          freeShippingEnabled: settings.freeShippingEnabled,
          freeShippingThreshold: settings.freeShippingThreshold
        }),
        'autoHealGetPromotionSettings'
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [PROMOTION-SETTINGS] Error fetching settings:', error);
    console.error('❌ [PROMOTION-SETTINGS] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * تحديث إعدادات الترويج
 * POST /api/promotion-settings
 * PUT /api/promotion-settings
 */
exports.updatePromotionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const settingsData = req.body;
    console.log('🔄 [PROMOTION-SETTINGS] Updating settings for company:', companyId);
    console.log('📤 [PROMOTION-SETTINGS] Data:', settingsData);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // التحقق من صحة البيانات
    const allowedFields = [
      'freeShippingEnabled',
      'freeShippingThreshold',
      'freeShippingMessage',
      'flatShippingEnabled',
      'flatShippingFee'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (settingsData[field] !== undefined) {
        if (field === 'freeShippingEnabled') {
          updateData[field] = Boolean(settingsData[field]);
        } else if (field === 'freeShippingThreshold' || field === 'flatShippingFee') {
          updateData[field] = parseFloat(settingsData[field]) || 0;
        } else if (field === 'flatShippingEnabled') {
          updateData[field] = Boolean(settingsData[field]);
        } else {
          updateData[field] = settingsData[field];
        }
      }
    }

    // تحديث أو إنشاء الإعدادات
    const settings = await safePromotionQuery(
      (p) => p.storePromotionSettings.upsert({
        where: { companyId },
        update: updateData,
        create: {
          companyId,
          ...updateData
        }
      }),
      'upsert'
    );

    console.log('✅ [PROMOTION-SETTINGS] Settings updated successfully:', settings.id);

    // Sync with conversion-suite app settings
    if (updateData.freeShippingEnabled !== undefined || updateData.freeShippingThreshold !== undefined) {
      await safePromotionQuery(
        (p) => syncConversionSuiteWithPromotionSettings(p, companyId, {
          freeShippingEnabled: settings.freeShippingEnabled,
          freeShippingThreshold: settings.freeShippingThreshold
        }),
        'syncConversionSuite'
      ).catch(err => {
        console.error('⚠️ [PROMOTION-SETTINGS] Non-blocking error syncing conversion-suite:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('❌ [PROMOTION-SETTINGS] Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الإعدادات',
      error: error.message
    });
  }
};

/**
 * جلب إعدادات الترويج للواجهة العامة (بدون مصادقة)
 * GET /api/public/promotion-settings/:companyId
 */
exports.getPublicPromotionSettings = async (req, res) => {
  try {
    // Use company from middleware (set by getCompanyFromSubdomain) or fallback to params
    const companyId = req.company?.id || req.params?.companyId;
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] ===== Route Hit =====');
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] Request URL:', req.originalUrl);
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] Request path:', req.path);
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] Request params:', req.params);
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] Company from middleware:', req.company?.id);
    console.log('🔍 [PROMOTION-SETTINGS-PUBLIC] Getting settings for company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // البحث عن الإعدادات
    let settings = await safePromotionQuery(
      (p) => p.storePromotionSettings.findUnique({
        where: { companyId },
        select: {
          freeShippingEnabled: true,
          freeShippingThreshold: true,
          freeShippingMessage: true,
          flatShippingEnabled: true,
          flatShippingFee: true
        }
      }),
      'findUnique-public'
    );

    // إذا لم توجد إعدادات، إرجاع القيم الافتراضية
    if (!settings) {
      settings = {
        freeShippingEnabled: false,
        freeShippingThreshold: 0,
        freeShippingMessage: 'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر',
        flatShippingEnabled: false,
        flatShippingFee: 0
      };
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [PROMOTION-SETTINGS-PUBLIC] Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message
    });
  }
};

/**
 * إعادة تعيين الإعدادات للقيم الافتراضية
 * POST /api/promotion-settings/reset
 */
exports.resetPromotionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // حذف الإعدادات الحالية وإنشاء جديدة بالقيم الافتراضية
    await safePromotionQuery(
      (p) => p.storePromotionSettings.deleteMany({ where: { companyId } }),
      'deleteMany'
    );

    const settings = await safePromotionQuery(
      (p) => p.storePromotionSettings.create({
        data: {
          companyId,
          freeShippingEnabled: false,
          freeShippingThreshold: 0,
          freeShippingMessage: 'احصل على شحن مجاني عند الشراء بـ {amount} جنيه أو أكثر',
          flatShippingEnabled: false,
          flatShippingFee: 0
        }
      }),
      'create-reset'
    );

    console.log('✅ [PROMOTION-SETTINGS] Settings reset to defaults:', settings.id);

    // Sync reset with conversion-suite
    safePromotionQuery(
      (p) => syncConversionSuiteWithPromotionSettings(p, companyId, {
        freeShippingEnabled: false,
        freeShippingThreshold: 0
      }),
      'syncResetConversionSuite'
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'تم إعادة تعيين الإعدادات للقيم الافتراضية',
      data: settings
    });
  } catch (error) {
    console.error('❌ [PROMOTION-SETTINGS] Error resetting settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إعادة تعيين الإعدادات',
      error: error.message
    });
  }
};
