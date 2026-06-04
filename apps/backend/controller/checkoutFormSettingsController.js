const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * 📋 Controller لإدارة إعدادات فورم الشيك أوت
 */

/**
 * جلب إعدادات فورم الشيك أوت للشركة
 * GET /api/checkout-form-settings
 */
exports.getCheckoutFormSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    console.log('🔍 [CHECKOUT-FORM-SETTINGS] Getting settings for company:', companyId);

    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // البحث عن الإعدادات
    let settings = await prisma.checkoutFormSettings.findUnique({
      where: { companyId }
    }).catch(err => {
      console.error('❌ [CHECKOUT-FORM-SETTINGS] Error finding settings:', err);
      throw err;
    });

    console.log('📊 [CHECKOUT-FORM-SETTINGS] Found settings:', settings ? 'Yes' : 'No');

    // إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
    if (!settings) {
      console.log('🔨 [CHECKOUT-FORM-SETTINGS] Creating default settings...');
      settings = await prisma.checkoutFormSettings.create({
        data: {
          companyId,
          // القيم الافتراضية محددة في schema.prisma
        }
      }).catch(err => {
        console.error('❌ [CHECKOUT-FORM-SETTINGS] Error creating settings:', err);
        throw err;
      });
      console.log('✅ [CHECKOUT-FORM-SETTINGS] Created settings:', settings.id);
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [CHECKOUT-FORM-SETTINGS] Error fetching settings:', error);
    console.error('❌ [CHECKOUT-FORM-SETTINGS] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * تحديث إعدادات فورم الشيك أوت
 * POST /api/checkout-form-settings
 * PUT /api/checkout-form-settings
 */
exports.updateCheckoutFormSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const settingsData = req.body;
    const prisma = getPrisma();

    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // التحقق من صحة البيانات
    const allowedFields = [
      'showGuestName',
      'requireGuestName',
      'showGuestPhone',
      'requireGuestPhone',
      'showGuestEmail',
      'requireGuestEmail',
      'showCity',
      'requireCity',
      'showShippingAddress',
      'requireShippingAddress',
      'showPaymentMethod',
      'showNotes'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (settingsData[field] !== undefined) {
        updateData[field] = Boolean(settingsData[field]);
      }
    }

    // تحديث أو إنشاء الإعدادات
    const settings = await prisma.checkoutFormSettings.upsert({
      where: { companyId },
      update: updateData,
      create: {
        companyId,
        ...updateData
      }
    });

    console.log('✅ [CHECKOUT-FORM-SETTINGS] Settings updated successfully:', settings.id);

    return res.status(200).json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('❌ [CHECKOUT-FORM-SETTINGS] Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث الإعدادات',
      error: error.message
    });
  }
};

/**
 * جلب إعدادات فورم الشيك أوت للواجهة العامة (بدون مصادقة)
 * GET /api/public/checkout-form-settings/:companyId
 */
exports.getPublicCheckoutFormSettings = async (req, res) => {
  try {
    let companyId = req.company?.id || req.companyId || req.params?.companyId || req.query?.companyId || req.query?.subdomain;
    const prisma = getPrisma();

    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // Check if companyId is a slug (subdomain) instead of actual ID
    const isSlug = !/^c[a-z0-9]{20,}$/.test(companyId);

    if (isSlug) {
      const company = await prisma.company.findFirst({
        where: {
          OR: [
            { slug: companyId },
            { customDomain: companyId }
          ],
          isActive: true
        },
        select: {
          id: true,
          slug: true,
          customDomain: true
        }
      });

      if (company) {
        companyId = company.id;
      } else {
        return res.status(404).json({
          success: false,
          message: 'الشركة غير موجودة'
        });
      }
    }

    // البحث عن الإعدادات
    let settings = await prisma.checkoutFormSettings.findUnique({
      where: { companyId },
      select: {
        // إرجاع الحقول المطلوبة فقط (بدون معلومات حساسة)
        showGuestName: true,
        requireGuestName: true,
        showGuestPhone: true,
        requireGuestPhone: true,
        showGuestEmail: true,
        requireGuestEmail: true,
        showCity: true,
        requireCity: true,
        showShippingAddress: true,
        requireShippingAddress: true,
        showPaymentMethod: true,
        showNotes: true
      }
    });

    // إذا لم توجد إعدادات، إرجاع القيم الافتراضية
    if (!settings) {
      settings = {
        showGuestName: true,
        requireGuestName: true,
        showGuestPhone: true,
        requireGuestPhone: true,
        showGuestEmail: true,
        requireGuestEmail: false,
        showCity: true,
        requireCity: true,
        showShippingAddress: true,
        requireShippingAddress: true,
        showPaymentMethod: true,
        showNotes: true
      };
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [CHECKOUT-FORM-SETTINGS] Error fetching public settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الإعدادات',
      error: error.message
    });
  }
};

/**
 * إعادة تعيين الإعدادات للقيم الافتراضية
 * POST /api/checkout-form-settings/reset
 */
exports.resetCheckoutFormSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();

    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // حذف الإعدادات الحالية وإنشاء جديدة بالقيم الافتراضية
    await prisma.checkoutFormSettings.deleteMany({
      where: { companyId }
    });

    const settings = await prisma.checkoutFormSettings.create({
      data: { companyId }
    });

    console.log('✅ [CHECKOUT-FORM-SETTINGS] Settings reset to defaults:', settings.id);

    return res.status(200).json({
      success: true,
      message: 'تم إعادة تعيين الإعدادات للقيم الافتراضية',
      data: settings
    });
  } catch (error) {
    console.error('❌ [CHECKOUT-FORM-SETTINGS] Error resetting settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إعادة تعيين الإعدادات',
      error: error.message
    });
  }
};
