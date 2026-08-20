const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const easyWarehouseService = require('../services/easyWarehouseService');

const SETTINGS_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

router.get('/settings', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const data = await easyWarehouseService.getSettings(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [EASY-WAREHOUSE] Error getting settings:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل الإعدادات' });
  }
});

router.put('/settings', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const data = await easyWarehouseService.updateSettings(companyId, req.body?.easyWarehouseMode);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [EASY-WAREHOUSE] Error updating settings:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر حفظ الإعدادات' });
  }
});

router.post('/ensure-products', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const data = await easyWarehouseService.ensureProductsForItems(companyId, req.body?.items || []);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [EASY-WAREHOUSE] Error ensuring products:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر إنشاء المنتجات' });
  }
});

module.exports = router;
