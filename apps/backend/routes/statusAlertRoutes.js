const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  getSettingsPageContext,
  normalizeStatusAlertSettings,
  validateStatusAlertSettings,
  sendTestAlert,
} = require('../services/orderStatusAlertService');

const SETTINGS_READ_ROLES = new Set([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
  'ADMIN',
  'MANAGER',
]);

const SETTINGS_WRITE_ROLES = new Set([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
  'ADMIN',
  'MANAGER',
]);

function hasOrderSettingsAccess(user, write = false) {
  if (!user) return false;
  const role = String(user.role || '').trim().toUpperCase();
  const allowedRoles = write ? SETTINGS_WRITE_ROLES : SETTINGS_READ_ROLES;
  if (allowedRoles.has(role)) return true;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (write) {
    return perms.includes('orders.settings.manage') || perms.includes('settings.manage');
  }
  return (
    perms.includes('orders.settings.view') ||
    perms.includes('orders.settings.manage') ||
    perms.includes('settings.manage')
  );
}

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
    if (!hasOrderSettingsAccess(req.user, false)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض إعدادات تنبيهات الحالات' });
    }

    const prisma = getSharedPrismaClient();
    const context = await getSettingsPageContext(companyId, prisma);
    res.json({
      success: true,
      data: context.settings,
      meta: {
        statuses: context.statuses,
        teamUsers: context.teamUsers,
        channelStatus: context.channelStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching status alert settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status alert settings',
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
    if (!hasOrderSettingsAccess(req.user, true)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل إعدادات تنبيهات الحالات' });
    }

    const validation = validateStatusAlertSettings(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const prisma = getSharedPrismaClient();
    const userIdentifier = req.user?.id || req.user?.userId || req.user?.email || req.user?.name || 'system';
    const nowIso = new Date().toISOString();

    const normalized = normalizeStatusAlertSettings({
      ...req.body,
      updatedBy: userIdentifier,
      updatedAt: nowIso,
    });

    const persistUpdate = async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });

      const companySettings = parseCompanySettings(company?.settings);
      companySettings.statusAlerts = normalized;

      if (Array.isArray(companySettings.auditTrail)) {
        companySettings.auditTrail.push({
          action: 'UPDATE_STATUS_ALERT_SETTINGS',
          updatedBy: userIdentifier,
          updatedAt: nowIso,
          settings: normalized,
        });
      }

      await tx.company.update({
        where: { id: companyId },
        data: { settings: JSON.stringify(companySettings) },
      });
    };

    if (typeof prisma.$transaction === 'function') {
      await prisma.$transaction(persistUpdate);
    } else {
      await persistUpdate(prisma);
    }

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
    if (!hasOrderSettingsAccess(req.user, true)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتشغيل اختبار تنبيهات الحالات' });
    }

    let settingsOverride = null;
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      const validation = validateStatusAlertSettings(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      settingsOverride = req.body;
    }

    const prisma = getSharedPrismaClient();
    const result = await sendTestAlert({
      companyId,
      user: req.user,
      settingsOverride,
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
    });
  }
});

module.exports = router;
