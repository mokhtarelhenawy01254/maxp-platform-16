const { safeQuery, initializeSharedDatabase } = require('../services/sharedDatabase');

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
