const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { invalidateWebhookCache } = require('../services/orderWebhookService');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const { TURBO_STATUS_DEFINITIONS, SYSTEM_STATUS_MAPPING } = require('../utils/statusNormalizer');

const COMPANY_SETTINGS_SELECT = Object.freeze({
  id: true,
  name: true,
  settings: true,
});

// 🔐 TICKET-2026-11-06-RBAC-01 F-04:
// مفاتيح تتحكم في تجاوز انتهاء الاشتراك/الوصول للتطبيقات المدفوعة.
// لا يجوز أن يكتبها إلا OWNER/SUPER_ADMIN — وإلا صار أي مستخدم يمدد اشتراكه مجاناً.
const PRIVILEGED_ONLY_SETTINGS_KEYS = Object.freeze([
  'bypassExpiry',
  'allowAccessWhenExpired',
  'graceAccess',
  'bypassAppExpiry',
  'whatsappAccessBypass',
]);
const PRIVILEGED_SETTINGS_ROLES = Object.freeze(['OWNER', 'SUPER_ADMIN']);

/**
 * يحذف مفاتيح التجاوز/الاشتراك من الـ payload لغير OWNER/SUPER_ADMIN.
 * @param {object} settings
 * @param {string} role دور المستدعي (req.user.role)
 * @returns {{ settings: object, strippedKeys: string[] }}
 */
const stripPrivilegedSettingsKeys = (settings, role) => {
  const normalizedRole =
    typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (PRIVILEGED_SETTINGS_ROLES.includes(normalizedRole)) {
    return { settings, strippedKeys: [] };
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { settings, strippedKeys: [] };
  }

  const sanitized = { ...settings };
  const strippedKeys = [];
  for (const key of PRIVILEGED_ONLY_SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      delete sanitized[key];
      strippedKeys.push(key);
    }
  }
  return { settings: sanitized, strippedKeys };
};

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

// 🔐 F-04: الأدوار الإدارية المعروفة تُحفظ كما كانت (بدون تراجع وظيفي)، وأي دور آخر
// (مثل AGENT أو دور مخصص) لازم يملك settings.manage صراحةً.
// مفاتيح تجاوز الاشتراك تبقى محظورة على غير OWNER/SUPER_ADMIN عبر stripPrivilegedSettingsKeys.
const SETTINGS_WRITE_ROLES = Object.freeze(['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']);
const requireSettingsWrite = (req, res, next) => {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (SETTINGS_WRITE_ROLES.includes(role)) return next();
  return requireDbPermission('settings.manage')(req, res, next);
};

// Update company settings
// 🔐 F-04: الكتابة تحتاج دوراً إدارياً أو صلاحية settings.manage — القراءة متاحة كما هي
router.put('/company', requireSettingsWrite, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { settings: safeSettings, strippedKeys } = stripPrivilegedSettingsKeys(
      req.body?.settings || {},
      req.user?.role,
    );
    const newSettings = safeSettings || {};

    if (strippedKeys.length > 0) {
      console.warn('🚫 [Settings] Stripped privileged keys from PUT /settings/company', {
        companyId,
        userId: req.user?.id,
        role: req.user?.role,
        strippedKeys,
      });
    }

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

const resolveSidebarCompanyId = (req) => {
  const userRole = String(req.user?.role || '').toUpperCase();
  if (['SHIPPING_CLIENT', 'STUDENT', 'CUSTOMER', 'COURIER'].includes(userRole)) return null;
  const headerCid = req.headers?.['x-company-id'] || req.headers?.['X-Company-Id'] || req.query?.companyId;
  if (headerCid) {
    if (userRole === 'SUPER_ADMIN') return String(headerCid).trim();
    if (req.user?.companyId === headerCid) return String(headerCid).trim();
    const hasCompany = Array.isArray(req.user?.userCompanies) && req.user.userCompanies.some(uc => uc.companyId === headerCid || uc.company?.id === headerCid);
    if (hasCompany) return String(headerCid).trim();
  }
  return req.user?.companyId || req.user?.effectiveCompanyId || req.user?.userCompanies?.[0]?.companyId || null;
};

// Get sidebar settings for current company
router.get('/sidebar', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = resolveSidebarCompanyId(req);
    if (!companyId) {
      // 👑 SUPER_ADMIN without a specific company: return default sidebar settings
      if (req.user?.role === 'SUPER_ADMIN') {
        return res.json({
          success: true,
          data: {
            layout: 'classic',
            settings: {}
          }
        });
      }
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

    let sidebarSettings = parsedSettings.sidebarSettings || {};

    let appsMap = {};
    try {
      const installedApps = await getSharedPrismaClient().companyApp.findMany({
        where: {
          companyId,
          status: { in: ['ACTIVE', 'TRIAL', 'active', 'trial'] }
        },
        include: {
          app: {
            select: { id: true, slug: true, name: true, category: true, icon: true, logo: true }
          }
        }
      });

      installedApps.forEach((ca) => {
        const appKey = ca.app?.slug || ca.appId;
        appsMap[appKey] = {
          id: ca.id,
          appId: ca.appId,
          slug: ca.app?.slug,
          name: ca.app?.name,
          customName: ca.customName || null
        };
      });
    } catch (appsErr) {
      console.warn('⚠️ [SIDEBAR-SETTINGS] Could not fetch installed apps:', appsErr.message);
    }

    // Harmonize education subjects visibility when education-app is active or educationSettings exists
    if (parsedSettings.educationSettings || appsMap['education-app']) {
      const eduSettings = parsedSettings.educationSettings || {};
      const eduMode = eduSettings.educationMode
        ? (eduSettings.educationMode === 'ACADEMIC' ? 'ACADEMIC' : 'COURSES')
        : (eduSettings.enableSubjects ? 'ACADEMIC' : 'COURSES');
      const enableSubjects = eduMode === 'COURSES'
        ? false
        : (eduSettings.enableSubjects !== undefined ? Boolean(eduSettings.enableSubjects) : true);

      const subjectsKeys = new Set([
        'education-subjects',
        '/admin/education/subjects',
        'admin/education/subjects',
        'education/subjects'
      ]);

      if (Array.isArray(sidebarSettings)) {
        sidebarSettings = sidebarSettings.map((item) => {
          if (item && item.key && subjectsKeys.has(String(item.key).toLowerCase())) {
            return { ...item, visible: enableSubjects };
          }
          return item;
        });
        const hasSubjects = sidebarSettings.some((it) => it && it.key && subjectsKeys.has(String(it.key).toLowerCase()));
        if (!hasSubjects) {
          sidebarSettings.push({ key: 'education-subjects', visible: enableSubjects, order: 1 });
          sidebarSettings.push({ key: '/admin/education/subjects', visible: enableSubjects, order: 1 });
        }
      } else if (sidebarSettings && typeof sidebarSettings === 'object' && !Array.isArray(sidebarSettings)) {
        if (!sidebarSettings.items || Array.isArray(sidebarSettings.items) || typeof sidebarSettings.items !== 'object') {
          if (!sidebarSettings.sections) {
            sidebarSettings.items = {};
          }
        }
        if (sidebarSettings.items && typeof sidebarSettings.items === 'object' && !Array.isArray(sidebarSettings.items)) {
          sidebarSettings.items['education-subjects'] = { ...(sidebarSettings.items['education-subjects'] || {}), visible: enableSubjects };
          sidebarSettings.items['/admin/education/subjects'] = { ...(sidebarSettings.items['/admin/education/subjects'] || {}), visible: enableSubjects };
        }
      }
    }

    res.json({
      success: true,
      data: {
        layout: company.sidebarLayout || 'classic',
        settings: sidebarSettings,
        apps: appsMap,
        educationSettings: parsedSettings.educationSettings || null
      },
      settings: sidebarSettings,
      apps: appsMap,
      educationSettings: parsedSettings.educationSettings || null
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
    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = Array.isArray(req.user?.userPermissions)
      ? req.user.userPermissions
      : (Array.isArray(req.user?.permissions) ? req.user.permissions : []);
    const hasSidebarPerm = userPerms.includes('settings.manage') || userPerms.includes('education.settings.manage');
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole) && !hasSidebarPerm) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل إعدادات القائمة الجانبية. هذه العملية مخصصة للمالك والمسؤولين فقط',
        code: 'FORBIDDEN'
      });
    }

    const companyId = resolveSidebarCompanyId(req);
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const prisma = getSharedPrismaClient();

    // 1. Handle apps customName if provided: apps: { [appId]: { customName } }
    if (req.body && typeof req.body === 'object' && req.body.apps && typeof req.body.apps === 'object') {
      for (const [appKey, appData] of Object.entries(req.body.apps)) {
        if (!appData || typeof appData !== 'object') continue;
        if (appData.customName !== undefined && appData.customName !== null) {
          const rawName = String(appData.customName);
          const sanitizedName = rawName.replace(/<[^>]*>?/gm, '').trim();
          if (sanitizedName.length > 0) {
            if (sanitizedName.length < 2 || sanitizedName.length > 24) {
              return res.status(400).json({
                success: false,
                message: 'الاسم المخصص للتطبيق يجب أن يكون بين 2 و 24 حرفاً',
                code: 'INVALID_APP_CUSTOM_NAME'
              });
            }
          }
          await prisma.companyApp.updateMany({
            where: {
              companyId,
              OR: [
                { id: appKey },
                { appId: appKey },
                { app: { slug: appKey } }
              ]
            },
            data: {
              customName: sanitizedName.length > 0 ? sanitizedName : null
            }
          });
        }
      }
    }

    let rawItems = null;
    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (req.body && typeof req.body === 'object') {
      if (Array.isArray(req.body.items)) {
        rawItems = req.body.items;
      } else if (req.body.items && typeof req.body.items === 'object') {
        rawItems = Object.entries(req.body.items).map(([key, item]) => ({
          key,
          ...(item || {})
        }));
      } else if (Array.isArray(req.body.settings)) {
        rawItems = req.body.settings;
      } else if (req.body.settings && typeof req.body.settings === 'object' && Array.isArray(req.body.settings.items)) {
        rawItems = req.body.settings.items;
      } else if (req.body.sections && typeof req.body.sections === 'object') {
        rawItems = Object.entries(req.body.sections).map(([key, item]) => ({
          key,
          ...(item || {})
        }));
      } else if (req.body.apps && Object.keys(req.body).length === 1) {
        return res.json({
          success: true,
          message: 'تم حفظ أسماء التطبيقات المخصصة بنجاح'
        });
      }
    }

    if (!rawItems || !Array.isArray(rawItems)) {
      return res.status(400).json({
        success: false,
        message: 'بيانات القائمة الجانبية غير صالحة. يجب إرسال مصفوفة من العناصر',
        code: 'INVALID_PAYLOAD'
      });
    }

    if (rawItems.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'تجاوز الحد الأقصى للعناصر (200 عنصر)',
        code: 'MAX_ITEMS_EXCEEDED'
      });
    }

    const validatedItems = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: `العنصر في الموضع ${i} غير صالح`,
          code: 'INVALID_ITEM'
        });
      }

      if (typeof item.key !== 'string' || !item.key.trim()) {
        return res.status(400).json({
          success: false,
          message: `مفتاح العنصر (key) مطلوب في الموضع ${i}`,
          code: 'MISSING_ITEM_KEY'
        });
      }

      const itemOrder = typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : i;
      if (item.order !== undefined && (typeof item.order !== 'number' || !Number.isFinite(item.order))) {
        return res.status(400).json({
          success: false,
          message: `ترتيب العنصر (order) مطلوب ويجب أن يكون رقماً في الموضع ${i}`,
          code: 'INVALID_ITEM_ORDER'
        });
      }

      const itemVisible = typeof item.visible === 'boolean' ? item.visible : true;
      if (item.visible !== undefined && typeof item.visible !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `حالة ظهور العنصر (visible) مطلوبة ويجب أن تكون قيمة منطقية في الموضع ${i}`,
          code: 'INVALID_ITEM_VISIBLE'
        });
      }

      let labelAr = undefined;
      const rawLabelAr = item.labelAr !== undefined ? item.labelAr : item.label;
      if (rawLabelAr !== undefined && rawLabelAr !== null) {
        if (typeof rawLabelAr !== 'string' || rawLabelAr.length > 60) {
          return res.status(400).json({
            success: false,
            message: 'الاسم بالعربية يجب ألا يتجاوز 60 حرفاً',
            code: 'INVALID_LABEL_AR'
          });
        }
        labelAr = rawLabelAr.replace(/<[^>]*>?/gm, '').trim();
      }

      let labelEn = undefined;
      if (item.labelEn !== undefined && item.labelEn !== null) {
        if (typeof item.labelEn !== 'string' || item.labelEn.length > 60) {
          return res.status(400).json({
            success: false,
            message: 'الاسم بالإنجليزية يجب ألا يتجاوز 60 حرفاً',
            code: 'INVALID_LABEL_EN'
          });
        }
        labelEn = item.labelEn.replace(/<[^>]*>?/gm, '').trim();
      }

      validatedItems.push({
        key: item.key.trim(),
        order: itemOrder,
        visible: itemVisible,
        ...(labelAr !== undefined ? { labelAr } : {}),
        ...(labelEn !== undefined ? { labelEn } : {}),
      });
    }

    validatedItems.sort((a, b) => a.order - b.order);
    validatedItems.forEach((it, idx) => {
      it.order = idx;
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
    }

    let currentSettings = {};
    try {
      currentSettings = company?.settings ? JSON.parse(company.settings) : {};
    } catch (e) {
      currentSettings = {};
    }

    // Merge sidebar settings inside company settings JSON without wiping unrelated keys or section sub-items
    const existingSidebar = Array.isArray(currentSettings.sidebarSettings)
      ? currentSettings.sidebarSettings
      : [];
    const incomingKeys = new Set(validatedItems.map((it) => it.key.toLowerCase()));
    const preservedItems = existingSidebar.filter((it) => it && it.key && !incomingKeys.has(String(it.key).toLowerCase()));
    currentSettings.sidebarSettings = [...validatedItems, ...preservedItems];

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({
      success: true,
      data: currentSettings.sidebarSettings,
      settings: currentSettings.sidebarSettings,
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

// ============================================
// 🛡️ Late Cancellation Settings Endpoints
// ============================================

// Get late cancellation settings
router.get('/cancellation', verifyToken.authenticateToken, async (req, res) => {
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
      select: { settings: true }
    });

    let parsedSettings = {};
    try {
      parsedSettings = company?.settings ? JSON.parse(company.settings) : {};
    } catch (e) {
      parsedSettings = {};
    }

    res.json({
      success: true,
      data: {
        lateCancellationInterceptEnabled: parsedSettings.lateCancellationInterceptEnabled ?? false,
        lateCancellationTargetStatuses: parsedSettings.lateCancellationTargetStatuses ?? []
      }
    });
  } catch (error) {
    console.error('❌ [CANCELLATION-SETTINGS] Error fetching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cancellation settings',
      details: error.message
    });
  }
});

// Update late cancellation settings
router.put('/cancellation', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { lateCancellationInterceptEnabled, lateCancellationTargetStatuses } = req.body;

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

    currentSettings.lateCancellationInterceptEnabled = lateCancellationInterceptEnabled ?? false;
    currentSettings.lateCancellationTargetStatuses = Array.isArray(lateCancellationTargetStatuses) ? lateCancellationTargetStatuses : [];

    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({
      success: true,
      data: {
        lateCancellationInterceptEnabled: currentSettings.lateCancellationInterceptEnabled,
        lateCancellationTargetStatuses: currentSettings.lateCancellationTargetStatuses
      },
      message: 'تم حفظ إعدادات اعتراض الإلغاء المتأخر بنجاح'
    });
  } catch (error) {
    console.error('❌ [CANCELLATION-SETTINGS] Error updating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cancellation settings',
      details: error.message
    });
  }
});

// ============================================
// 🎨 Brand Identity Endpoints
// ============================================

// Get brand identity
router.get('/brand-identity', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب', code: 'COMPANY_ID_REQUIRED' });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    let parsed = {};
    try { parsed = company?.settings ? JSON.parse(company.settings) : {}; } catch (e) { parsed = {}; }

    const defaults = {
      brandName: '',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#ff0000',
      headingFont: 'Cairo',
      bodyFont: 'Tajawal',
      brandVoice: '',
      designRules: '',
      visualGuidelines: '',
    };

    res.json({ success: true, data: { ...defaults, ...(parsed.brandIdentity || {}) } });
  } catch (error) {
    console.error('❌ [BRAND-IDENTITY] Error fetching:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch brand identity', details: error.message });
  }
});

// Update brand identity
router.put('/brand-identity', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب', code: 'COMPANY_ID_REQUIRED' });
    }

    const brandData = req.body;
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    let currentSettings = {};
    try { currentSettings = company?.settings ? JSON.parse(company.settings) : {}; } catch (e) { currentSettings = {}; }

    currentSettings.brandIdentity = {
      ...(currentSettings.brandIdentity || {}),
      ...brandData,
      updatedAt: new Date().toISOString()
    };

    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({ success: true, data: currentSettings.brandIdentity, message: 'تم حفظ الهوية البصرية بنجاح' });
  } catch (error) {
    console.error('❌ [BRAND-IDENTITY] Error updating:', error);
    res.status(500).json({ success: false, error: 'Failed to update brand identity', details: error.message });
  }
});

// ============================================
// 🚚 Turbo Status Mapping Endpoints
// ============================================

const TURBO_STATUS_ORDER_MAP_DEFAULTS = Object.fromEntries(
  Object.entries(SYSTEM_STATUS_MAPPING).map(([key, val]) => [key, { orderStatus: val.orderStatus }])
);

// Get turbo status mapping
router.get('/turbo-status-mapping', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب', code: 'COMPANY_ID_REQUIRED' });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    let parsed = {};
    try { parsed = company?.settings ? JSON.parse(company.settings) : {}; } catch (e) { parsed = {}; }

    const savedMapping = parsed.turboStatusMapping || {};

    // Merge saved mapping with defaults — any Turbo status not in saved mapping uses default
    const mergedMapping = { ...TURBO_STATUS_ORDER_MAP_DEFAULTS };
    for (const [key, val] of Object.entries(savedMapping)) {
      if (mergedMapping[key]) {
        mergedMapping[key] = { orderStatus: val.orderStatus || null };
      }
    }

    res.json({
      success: true,
      data: {
        turboStatuses: TURBO_STATUS_DEFINITIONS,
        mapping: mergedMapping,
        defaults: TURBO_STATUS_ORDER_MAP_DEFAULTS
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-STATUS-MAPPING] Error fetching:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch turbo status mapping', details: error.message });
  }
});

// Update turbo status mapping
router.put('/turbo-status-mapping', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب', code: 'COMPANY_ID_REQUIRED' });
    }

    const { mapping } = req.body;
    if (!mapping || typeof mapping !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات mapping غير صالحة' });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    let currentSettings = {};
    try { currentSettings = company?.settings ? JSON.parse(company.settings) : {}; } catch (e) { currentSettings = {}; }

    // Validate: only allow canonical Turbo statuses
    const validKeys = Object.keys(TURBO_STATUS_DEFINITIONS);
    const cleanMapping = {};
    for (const [key, val] of Object.entries(mapping)) {
      if (validKeys.includes(key)) {
        cleanMapping[key] = { orderStatus: val?.orderStatus || null };
      }
    }

    currentSettings.turboStatusMapping = cleanMapping;

    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({
      success: true,
      data: { mapping: cleanMapping },
      message: 'تم حفظ ربط حالات Turbo بنجاح'
    });
  } catch (error) {
    console.error('❌ [TURBO-STATUS-MAPPING] Error updating:', error);
    res.status(500).json({ success: false, error: 'Failed to update turbo status mapping', details: error.message });
  }
});

module.exports = router;


