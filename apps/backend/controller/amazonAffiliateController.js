// Amazon Affiliate controller — routes under /api/v1/amazon-affiliate
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const service = require('../services/amazonAffiliateService');

const SECRET_FIELD = 'credentialSecret';

function serializeSettings(settings) {
  if (!settings) return null;
  const { [SECRET_FIELD]: _secret, ...safe } = settings;
  return {
    ...safe,
    hasCredentials: !!(settings.credentialId && settings.credentialSecret && settings.credentialVersion),
    marketplaces: service.MARKETPLACE_OPTIONS,
  };
}

/**
 * GET /api/v1/amazon-affiliate/settings
 */
const getSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const settings = await service.getSettings(companyId);
    return res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات', error: error.message });
  }
};

/**
 * PUT /api/v1/amazon-affiliate/settings
 * body: { associateTag, marketplace, enableBuyButton, autoSyncEnabled, disclosureEnabled,
 *         dataSource, credentialId?, credentialSecret?, credentialVersion? }
 */
const updateSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { associateTag, marketplace, enableBuyButton, autoSyncEnabled, disclosureEnabled, dataSource, credentialId, credentialSecret, credentialVersion } = req.body || {};

    const existing = await service.getSettings(companyId);
    const payload = {
      associateTag: associateTag !== undefined ? String(associateTag).trim() : undefined,
      marketplace: marketplace || undefined,
      enableBuyButton: enableBuyButton !== undefined ? !!enableBuyButton : undefined,
      autoSyncEnabled: autoSyncEnabled !== undefined ? !!autoSyncEnabled : undefined,
      disclosureEnabled: disclosureEnabled !== undefined ? !!disclosureEnabled : undefined,
      dataSource: dataSource || undefined,
      credentialId: credentialId !== undefined ? String(credentialId).trim() || null : undefined,
      credentialVersion: credentialVersion !== undefined ? String(credentialVersion).trim() || null : undefined,
    };
    // Only overwrite the secret when a non-empty value is provided (keep existing otherwise).
    if (credentialSecret !== undefined && String(credentialSecret).trim() !== '') {
      payload.credentialSecret = String(credentialSecret).trim();
    }
    Object.keys(payload).forEach((k) => { if (payload[k] === undefined) delete payload[k]; });

    const settings = await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();
      if (existing) {
        return prisma.amazonAffiliateSettings.update({ where: { companyId }, data: payload });
      }
      return prisma.amazonAffiliateSettings.create({ data: { companyId, ...payload } });
    });

    return res.json({ success: true, data: serializeSettings(settings) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في حفظ الإعدادات', error: error.message });
  }
};

/**
 * POST /api/v1/amazon-affiliate/import
 * body: { inputs: string[] } | { input: string }
 */
const importProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { inputs, input } = req.body || {};
    const list = Array.isArray(inputs) ? inputs : input ? [input] : [];
    const result = await service.importMany({ companyId, inputs: list });
    if (result.ok === false) {
      return res.status(400).json({ success: false, message: 'لا يوجد مدخلات صالحة للاستيراد', error: result.error });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في الاستيراد', error: error.message });
  }
};

/**
 * GET /api/v1/amazon-affiliate/products
 */
const listProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const data = await service.listProducts(companyId);
    return res.json({ success: true, data, total: data.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في جلب المنتجات', error: error.message });
  }
};

/**
 * POST /api/v1/amazon-affiliate/sync
 */
const syncProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const data = await service.syncProducts(companyId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في المزامنة', error: error.message });
  }
};

/**
 * DELETE /api/v1/amazon-affiliate/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });
    const result = await service.deleteProduct(companyId, req.params.id);
    if (!result.ok) return res.status(404).json({ success: false, message: 'المنتج غير موجود', error: result.error });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في حذف المنتج', error: error.message });
  }
};

/**
 * GET /api/v1/amazon-affiliate/resolve?input=...&country=EG
 * Resolve an ASIN and return a preview (used by the import UI before committing).
 */
const resolveProduct = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const asin = service.resolveAsinFromUrl(req.query.input);
    if (!asin) return res.status(400).json({ success: false, message: 'لا يمكن استخراج ASIN من المدخل', error: 'INVALID_ASIN' });

    const settings = await service.getSettings(companyId);
    const marketplace = req.query.country ? service.resolveMarketplaceForCountry(req.query.country) : (settings?.marketplace || service.DEFAULT_MARKETPLACE);
    const data = await service.fetchAmazonProductData({ asin, marketplace, settings });
    const amazonUrl = service.buildAffiliateUrl({ asin, associateTag: settings?.associateTag, marketplace });

    return res.json({
      success: true,
      data: { asin, marketplace, amazonUrl, data },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في فحص المنتج', error: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  importProducts,
  listProducts,
  syncProducts,
  deleteProduct,
  resolveProduct,
};