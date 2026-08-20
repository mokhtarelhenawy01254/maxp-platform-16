const tiktokShopService = require('../services/tiktok/tiktokShopService');

function sanitizeAccount(account) {
  return {
    connected: true,
    shopId: account?.shopId || null,
    shopName: account?.shopName || null,
    region: account?.region || null,
    status: account?.status || null,
    lastSyncedAt: account?.lastSyncedAt || null
  };
}

const getAccountStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const account = await tiktokShopService.getAccount(companyId);
    if (!account) return res.json({ success: true, data: { connected: false } });

    res.json({ success: true, data: sanitizeAccount(account) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب حالة الحساب' });
  }
};

const saveAccount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { shopId, appKey, appSecret, accessToken, shopName, region } = req.body || {};
    if (!shopId || !appKey || !appSecret || !accessToken) {
      return res.status(400).json({ success: false, error: 'بيانات الربط ناقصة' });
    }

    const account = await tiktokShopService.saveAccount(companyId, {
      shopId,
      appKey,
      appSecret,
      accessToken,
      shopName,
      region
    });

    res.json({ success: true, data: sanitizeAccount(account) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في حفظ بيانات الربط' });
  }
};

const syncOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const pageSize = req.body?.pageSize || req.query?.pageSize;
    const orders = await tiktokShopService.fetchOrders({ companyId, pageSize });

    res.json({ success: true, data: { data: orders, count: orders.length } });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'خطأ في مزامنة الطلبات' });
  }
};

const syncProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const pageSize = req.body?.pageSize || req.query?.pageSize;
    const products = await tiktokShopService.fetchProducts({ companyId, pageSize });

    res.json({ success: true, data: { data: products, count: products.length } });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'خطأ في مزامنة المنتجات' });
  }
};

module.exports = {
  getAccountStatus,
  saveAccount,
  syncOrders,
  syncProducts
};
