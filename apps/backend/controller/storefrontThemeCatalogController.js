const {
  getSharedPrismaClientAsync,
  executeWithRetry,
} = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const {
  storefrontThemeCatalogService,
} = require('../services/storefrontThemeCatalogService');
const redisCacheService = require('../services/redisCacheService');

const runWithoutTenantContext = (operation) =>
  tenantContext.run(null, operation);

const resolveCompanyId = (req) =>
  req.user?.effectiveCompanyId ||
  req.user?.companyId ||
  null;

const resolveCurrentThemeId = async (companyId) => {
  if (!companyId) {
    return '';
  }

  const settings = await runWithoutTenantContext(() =>
    executeWithRetry(async () => {
      const prisma = await getSharedPrismaClientAsync();
      return prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: {
          designTokens: true,
        },
      });
    })
  );

  const designTokens =
    settings?.designTokens &&
    typeof settings.designTokens === 'object' &&
    !Array.isArray(settings.designTokens)
      ? settings.designTokens
      : {};

  return typeof designTokens.themeId === 'string' ? designTokens.themeId.trim() : '';
};

const getAdminCatalog = async (req, res) => {
  try {
    const items = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.getAdminCatalog()
    );
    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to load admin catalog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load storefront theme catalog',
      error: error.message,
    });
  }
};

const updateTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const updated = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.updateTheme(themeId, req.body || {})
    );

    return res.json({
      success: true,
      message: 'تم تحديث القالب بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to update theme:', error);
    const statusCode =
      error.code === 'THEME_NOT_FOUND'
        ? 404
        : error.code === 'DEFAULT_THEME_LOCKED'
          ? 400
          : 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404
          ? 'القالب المطلوب غير موجود'
          : error.code === 'DEFAULT_THEME_LOCKED'
            ? 'لا يمكن إخفاء أو تعطيل القالب الافتراضي. عيّن قالبًا افتراضيًا آخر أولًا'
          : 'Failed to update storefront theme catalog',
      error: error.message,
    });
  }
};

const setDefaultTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const updated = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.setDefaultTheme(themeId)
    );

    return res.json({
      success: true,
      message: 'تم تعيين القالب الافتراضي للمتاجر الجديدة',
      data: updated,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to set default theme:', error);
    const statusCode =
      error.code === 'THEME_NOT_FOUND'
        ? 404
        : error.code === 'THEME_ID_REQUIRED'
          ? 400
          : 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404
          ? 'القالب المطلوب غير موجود'
          : statusCode === 400
            ? 'يجب تحديد القالب أولًا'
            : 'Failed to set default storefront theme',
      error: error.message,
    });
  }
};

const getCompanyCatalog = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const currentThemeId = await resolveCurrentThemeId(companyId);
    const items = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.getCompanyCatalog({
        companyId,
        currentThemeId,
        includeUnavailable: true,
      })
    );

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to load company catalog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load company storefront theme catalog',
      error: error.message,
    });
  }
};

const getPurchaseHistory = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const limit = Number(req.query?.limit || 10);
    const items = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.getCompanyPurchaseHistory({
        companyId,
        limit,
      })
    );

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to load purchase history:', error);
    const statusCode =
      error.code === 'COMPANY_REQUIRED'
        ? 400
        : error.code === 'COMPANY_NOT_FOUND'
          ? 404
          : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404
          ? 'الشركة الحالية غير موجودة'
          : statusCode === 400
            ? 'يجب تحديد الشركة الحالية أولًا'
            : 'Failed to load storefront theme purchase history',
      error: error.message,
    });
  }
};

const activateTheme = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const { themeId } = req.params;
    const activation = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.applyThemeForCompany(
        themeId,
        { companyId },
      )
    );

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (err) {
      console.error('⚠️ [REDIS] failed to invalidate settings cache:', err);
    }

    return res.json({
      success: true,
      message: 'تم تطبيق القالب على المتجر بنجاح',
      data: activation,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to activate theme:', error);
    const statusCode =
      error.code === 'THEME_NOT_FOUND'
        ? 404
        : error.code === 'THEME_UNAVAILABLE'
          ? 400
          : error.code === 'THEME_PURCHASE_REQUIRED'
            ? 400
          : error.code === 'COMPANY_REQUIRED'
            ? 400
            : error.code === 'COMPANY_NOT_FOUND'
              ? 404
              : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404
          ? error.code === 'COMPANY_NOT_FOUND'
            ? 'الشركة الحالية غير موجودة'
            : 'القالب المطلوب غير موجود'
          : statusCode === 400
            ? error.code === 'THEME_PURCHASE_REQUIRED'
              ? 'يجب شراء القالب أولًا قبل تطبيقه على المتجر'
              : 'القالب المحدد غير متاح للتطبيق حاليًا'
            : 'Failed to activate storefront theme',
      error: error.message,
    });
  }
};

const purchaseTheme = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      });
    }

    const { themeId } = req.params;
    const purchase = await runWithoutTenantContext(() =>
      storefrontThemeCatalogService.purchaseThemeForCompany(themeId, {
        companyId,
      })
    );

    return res.json({
      success: true,
      message: 'تم شراء القالب بنجاح',
      data: purchase,
    });
  } catch (error) {
    console.error('❌ [THEME-CATALOG] Failed to purchase theme:', error);
    const statusCode =
      error.code === 'THEME_NOT_FOUND'
        ? 404
        : error.code === 'THEME_UNAVAILABLE'
          ? 400
          : error.code === 'THEME_FREE'
            ? 400
            : error.code === 'INSUFFICIENT_WALLET_BALANCE'
              ? 400
              : error.code === 'COMPANY_REQUIRED'
                ? 400
                : error.code === 'COMPANY_NOT_FOUND'
                  ? 404
                  : 500;

    return res.status(statusCode).json({
      success: false,
      code: error.code || (statusCode === 400 && error.message?.includes('رصيد المحفظة') ? 'INSUFFICIENT_WALLET_BALANCE' : undefined),
      message:
        statusCode === 404
          ? error.code === 'COMPANY_NOT_FOUND'
            ? 'الشركة الحالية غير موجودة'
            : 'القالب المطلوب غير موجود'
          : statusCode === 400
            ? error.code === 'INSUFFICIENT_WALLET_BALANCE'
              ? 'رصيد المحفظة غير كافٍ لشراء هذا القالب'
              : error.code === 'THEME_FREE'
                ? 'هذا القالب مجاني ولا يحتاج إلى شراء'
                : 'تعذر إتمام شراء القالب حاليًا'
            : 'Failed to purchase storefront theme',
      requiredAmount: error.requiredAmount !== undefined ? error.requiredAmount : null,
      currentBalance: error.currentBalance !== undefined ? error.currentBalance : null,
      currency: error.currency || 'EGP',
      error: error.message,
    });
  }
};

module.exports = {
  getAdminCatalog,
  updateTheme,
  setDefaultTheme,
  getCompanyCatalog,
  getPurchaseHistory,
  activateTheme,
  purchaseTheme,
};
