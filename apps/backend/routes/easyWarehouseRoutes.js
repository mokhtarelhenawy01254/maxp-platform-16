const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const easyWarehouseService = require('../services/easyWarehouseService');

const SETTINGS_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

router.get('/settings', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘ü┘é┘ê╪»' });
    const data = await easyWarehouseService.getSettings(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Γ¥î [EASY-WAREHOUSE] Error getting settings:', error);
    res.status(500).json({ success: false, message: error.message || '╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬' });
  }
});

router.put('/settings', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘ü┘é┘ê╪»' });
    const data = await easyWarehouseService.updateSettings(companyId, req.body?.easyWarehouseMode);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Γ¥î [EASY-WAREHOUSE] Error updating settings:', error);
    res.status(500).json({ success: false, message: error.message || '╪¬╪╣╪░╪▒ ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬' });
  }
});

router.post('/ensure-products', verifyToken.authenticateToken, verifyToken.requireRole(SETTINGS_ROLES), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘ü┘é┘ê╪»' });
    const data = await easyWarehouseService.ensureProductsForItems(companyId, req.body?.items || []);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Γ¥î [EASY-WAREHOUSE] Error ensuring products:', error);
    res.status(500).json({ success: false, message: error.message || '╪¬╪╣╪░╪▒ ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘å╪¬╪¼╪º╪¬' });
  }
});

module.exports = router;
