const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  getStatusAlertSettings,
  normalizeStatusAlertSettings,
  validateStatusAlertSettings,
  sendTestAlert,
} = require('../services/orderStatusAlertService');

// Authenticated company users only — intentionally NOT gated by checkAppAccess('order-invoicing')
router.use(authenticateToken);

function parseCompanySettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
}

// GET /api/v1/order-status-alerts
router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company ID is missing from token' });
    }

    const prisma = getSharedPrismaClient();
    const data = await getStatusAlertSettings(companyId, prisma);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching status alert settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status alert settings',
      error: error.message,
    });
  }
});

// PUT /api/v1/order-status-alerts
router.put('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company ID is missing from token' });
    }

    const validation = validateStatusAlertSettings(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const companySettings = parseCompanySettings(company?.settings);
    const userIdentifier = req.user?.id || req.user?.userId || req.user?.email || req.user?.name || 'system';
    const nowIso = new Date().toISOString();

    const normalized = normalizeStatusAlertSettings({
      ...req.body,
      updatedBy: userIdentifier,
      updatedAt: nowIso,
    });

    companySettings.statusAlerts = normalized;

    if (Array.isArray(companySettings.auditTrail)) {
      companySettings.auditTrail.push({
        action: 'UPDATE_STATUS_ALERT_SETTINGS',
        updatedBy: userIdentifier,
        updatedAt: nowIso,
        settings: normalized,
      });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(companySettings) },
    });

    res.json({
      success: true,
      message: 'تم حفظ إعدادات تنبيهات الحالات بنجاح',
      data: normalized,
    });
  } catch (error) {
    console.error('Error updating status alert settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status alert settings',
      error: error.message,
    });
  }
});

// POST /api/v1/order-status-alerts/test
router.post('/test', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company ID is missing from token' });
    }

    const prisma = getSharedPrismaClient();
    const result = await sendTestAlert({
      companyId,
      user: req.user,
      prisma,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error sending test status alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test status alert',
      error: error.message,
    });
  }
});

module.exports = router;
