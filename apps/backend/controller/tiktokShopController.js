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
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const account = await tiktokShopService.getAccount(companyId);
    if (!account) return res.json({ success: true, data: { connected: false } });

    res.json({ success: true, data: sanitizeAccount(account) });
  } catch (error) {
    res.status(500).json({ success: false, error: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪│╪º╪¿' });
  }
};

const saveAccount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { shopId, appKey, appSecret, accessToken, shopName, region } = req.body || {};
    if (!shopId || !appKey || !appSecret || !accessToken) {
      return res.status(400).json({ success: false, error: '╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪▒╪¿╪╖ ┘å╪º┘é╪╡╪⌐' });
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
    res.status(500).json({ success: false, error: '╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪▒╪¿╪╖' });
  }
};

const syncOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const pageSize = req.body?.pageSize || req.query?.pageSize;
    const orders = await tiktokShopService.fetchOrders({ companyId, pageSize });

    res.json({ success: true, data: { data: orders, count: orders.length } });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: '╪«╪╖╪ú ┘ü┘è ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬' });
  }
};

const syncProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const pageSize = req.body?.pageSize || req.query?.pageSize;
    const products = await tiktokShopService.fetchProducts({ companyId, pageSize });

    res.json({ success: true, data: { data: products, count: products.length } });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: '╪«╪╖╪ú ┘ü┘è ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬' });
  }
};

module.exports = {
  getAccountStatus,
  saveAccount,
  syncOrders,
  syncProducts
};
