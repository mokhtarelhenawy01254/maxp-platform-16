const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { invalidateWebhookCache } = require('../services/orderWebhookService');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const verifyToken = require('../utils/verifyToken');

const COMPANY_SETTINGS_SELECT = Object.freeze({
  id: true,
  name: true,
  settings: true,
});

// Apply authentication middleware to all routes except public ones
// Public routes (no auth required): /currencies
router.use((req, res, next) => {
  // Skip authentication for public routes
  if (req.path === '/currencies') {
    return next();
  }
  // Apply authentication to all other routes
  verifyToken.authenticateToken(req, res, next);
});

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (token === 'mock-access-token' || token.includes('mock-signature')) {
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'cmd5c0c9y0000ymzdd7wtv7ib'
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'رمز المصادقة غير صحيح',
    code: 'INVALID_TOKEN'
  });
};

// Get company settings
router.get('/company', async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: COMPANY_SETTINGS_SELECT,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse settings if they exist
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing company settings:', error);
      settings = {};
    }

    // Default settings with safe values
    const defaultSettings = {
      currency: 'EGP',
      currencySymbol: 'جنيه',
      language: 'ar',
      timezone: 'Africa/Cairo',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-EG',
      // Add safe defaults for frontend
      autoReply: false,
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    };

    const finalSettings = { ...defaultSettings, ...settings };

    // Ensure all nested objects exist
    if (!finalSettings.workingHours) {
      finalSettings.workingHours = defaultSettings.workingHours;
    }
    if (!finalSettings.notifications) {
      finalSettings.notifications = defaultSettings.notifications;
    }

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        settings: finalSettings
      }
    });

  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message
    });
  }
});

// Update company settings
router.put('/company', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const newSettings = req.body.settings || {};

    //console.log('Updating company settings:', companyId, newSettings);

    // Get current company
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: COMPANY_SETTINGS_SELECT,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Parse existing settings
    let currentSettings = {};
    try {
      currentSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      //console.log('Error parsing existing settings, starting fresh');
      currentSettings = {};
    }

    // Merge settings
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Update company
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify(updatedSettings)
      },
      select: COMPANY_SETTINGS_SELECT,
    });

    if (
      Object.prototype.hasOwnProperty.call(newSettings, 'googleSheetsWebhookUrl') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'googleSheetsWebhookEnabled') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'googleSheetsWebhookSecret')
    ) {
      invalidateWebhookCache(companyId);
    }

    //console.log('Company settings updated successfully');

    res.json({
      success: true,
      data: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        settings: updatedSettings
      },
      message: 'تم تحديث الإعدادات بنجاح'
    });

  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

// Currency presets
router.get('/currencies', (req, res) => {
  const currencies = [
    {
      code: 'EGP',
      name: 'جنيه مصري',
      symbol: 'جنيه',
      symbolEn: 'EGP'
    },
    {
      code: 'SAR',
      name: 'ريال سعودي',
      symbol: 'ريال',
      symbolEn: 'SAR'
    },
    {
      code: 'AED',
      name: 'درهم إماراتي',
      symbol: 'درهم',
      symbolEn: 'AED'
    },
    {
      code: 'USD',
      name: 'دولار أمريكي',
      symbol: '$',
      symbolEn: 'USD'
    }
  ];

  res.json({
    success: true,
    data: currencies
  });
});

// ============================================
// 💡 Recommendation Settings Endpoints
// ============================================

// Get featured products
router.get('/featured-products', verifyToken.authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch featured products', details: error.message });
  }
});

// Get recommendation settings
router.get('/recommendation-settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لإعدادات التوصيات',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;

    // محاولة جلب الإعدادات من قاعدة البيانات
    try {
      // البحث في Company.settings JSON field
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      if (company && company.settings) {
        try {
          const parsedSettings = JSON.parse(company.settings);
          if (parsedSettings.recommendationSettings) {
            return res.json({
              success: true,
              data: parsedSettings.recommendationSettings
            });
          }
        } catch (e) {
          // JSON parsing failed, continue to defaults
        }
      }
    } catch (dbError) {
      console.error('❌ [RECOMMENDATION-SETTINGS] Database error:', dbError);
    }

    // إعدادات افتراضية
    const defaultSettings = {
      companyId,
      enableRelatedProducts: true,
      enableFrequentlyBought: true,
      enableUpsell: true,
      enableCartRecommendations: true,
      relatedProductsLimit: 6,
      frequentlyBoughtLimit: 4,
      upsellLimit: 4,
      cartRecommendationsLimit: 6,
      minOrdersForFrequentlyBought: 5,
      upsellPriceRange: 20
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('❌ [RECOMMENDATION-SETTINGS] Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendation settings',
      details: error.message
    });
  }
});

// Update recommendation settings
router.post('/recommendation-settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لتحديث إعدادات التوصيات',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const companyId = req.user.companyId;
    const settings = req.body;

    // التحقق من البيانات
    if (!settings.companyId || settings.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة غير متطابق'
      });
    }

    try {
      // جلب الإعدادات الحالية للشركة
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { settings: true }
      });

      let currentSettings = {};
      if (company && company.settings) {
        try {
          currentSettings = JSON.parse(company.settings);
        } catch (e) {
          currentSettings = {};
        }
      }

      // تحديث إعدادات التوصيات
      currentSettings.recommendationSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      // حفظ في قاعدة البيانات
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: {
          settings: JSON.stringify(currentSettings)
        }
      });

      res.json({
        success: true,
        data: currentSettings.recommendationSettings,
        message: 'تم حفظ إعدادات التوصيات بنجاح'
      });
    } catch (dbError) {
      console.error('❌ [RECOMMENDATION-SETTINGS] Database error:', dbError);
      res.status(500).json({
        success: false,
        error: 'Failed to save recommendation settings',
        details: dbError.message
      });
    }
  } catch (error) {
    console.error('❌ [RECOMMENDATION-SETTINGS] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation settings',
      details: error.message
    });
  }
});

// ============================================
// 📋 Sidebar Management Settings Endpoints
// ============================================

// Get sidebar settings for current company
router.get('/sidebar', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true, sidebarLayout: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    let parsedSettings = {};
    try {
      parsedSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch (e) {
      parsedSettings = {};
    }

    const sidebarSettings = parsedSettings.sidebarSettings || {};

    res.json({
      success: true,
      data: {
        layout: company.sidebarLayout || 'three-tier',
        settings: sidebarSettings
      }
    });
  } catch (error) {
    console.error('❌ [SIDEBAR-SETTINGS] Error fetching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sidebar settings',
      details: error.message
    });
  }
});

// Update sidebar settings
router.put('/sidebar', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'بيانات الإعدادات غير صالحة'
      });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    let currentSettings = {};
    try {
      currentSettings = company?.settings ? JSON.parse(company.settings) : {};
    } catch (e) {
      currentSettings = {};
    }

    // Merge sidebar settings
    currentSettings.sidebarSettings = {
      ...(currentSettings.sidebarSettings || {}),
      ...settings,
      updatedAt: new Date().toISOString()
    };

    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({
      success: true,
      data: currentSettings.sidebarSettings,
      message: 'تم حفظ إعدادات القائمة الجانبية بنجاح'
    });
  } catch (error) {
    console.error('❌ [SIDEBAR-SETTINGS] Error updating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sidebar settings',
      details: error.message
    });
  }
});

// ============================================
// 👤 Per-User Sidebar Settings Endpoints
// ============================================

// Get per-user sidebar settings
router.get('/user-sidebar', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        code: 'USER_ID_REQUIRED'
      });
    }

    // Try to get per-user settings from user record or a separate table
    // For now, we return an empty settings object - frontend uses localStorage
    res.json({
      success: true,
      data: {
        enabled: false,
        sections: {},
      }
    });
  } catch (error) {
    console.error('❌ [USER-SIDEBAR] Error fetching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user sidebar settings',
      details: error.message
    });
  }
});

// Update per-user sidebar settings
router.put('/user-sidebar', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        code: 'USER_ID_REQUIRED'
      });
    }

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'بيانات الإعدادات غير صالحة'
      });
    }

    // For now, we acknowledge the update - frontend manages this via localStorage
    res.json({
      success: true,
      data: settings,
      message: 'تم حفظ إعدادات القائمة الجانبية الشخصية'
    });
  } catch (error) {
    console.error('❌ [USER-SIDEBAR] Error updating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user sidebar settings',
      details: error.message
    });
  }
});

module.exports = router;


