const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { DEFAULT_SETTINGS, getRadiologyIdSettings } = require('../utils/radiologyNumbering');
const { getRadiologyGuards } = require('../utils/radiologyGuards');
const { DEFAULT_DELIVERY, getRadiologyDeliverySettings } = require('../utils/radiologyDeliverySettings');
const { getRadiologyRiskFlags, saveRadiologyRiskFlags } = require('../utils/radiologyRiskFlags');

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

const listSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const settings = await getRadiologyIdSettings(prisma, companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error listing radiology id settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    const entries = [];
    if (body.bookingPrefix !== undefined) {
      const v = String(body.bookingPrefix).trim().slice(0, 10);
      entries.push(['bookingPrefix', v === '' ? DEFAULT_SETTINGS.bookingPrefix : v]);
    }
    if (body.patientPrefix !== undefined) {
      const v = String(body.patientPrefix).trim().slice(0, 10);
      entries.push(['patientPrefix', v === '' ? DEFAULT_SETTINGS.patientPrefix : v]);
    }
    if (body.digits !== undefined) {
      const n = parseInt(body.digits, 10);
      entries.push(['digits', String(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : DEFAULT_SETTINGS.digits)]);
    }
    if (body.enabled !== undefined) {
      entries.push(['enabled', body.enabled === true || body.enabled === 'true' ? 'true' : 'false']);
    }

    for (const [key, value] of entries) {
      await prisma.radiologySetting.upsert({
        where: { companyId_key: { companyId, key } },
        update: { value },
        create: { companyId, key, value },
      });
    }

    const settings = await getRadiologyIdSettings(prisma, companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating radiology id settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

const listGuards = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const guards = await getRadiologyGuards(getSharedPrismaClient(), companyId);
    res.json({ success: true, data: guards });
  } catch (error) {
    console.error('Error listing radiology guards:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحراسات' });
  }
};

const updateGuards = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    const entries = [];
    if (body.requirePaymentBeforeDelivery !== undefined) {
      entries.push(['requirePaymentBeforeDelivery', body.requirePaymentBeforeDelivery === true || body.requirePaymentBeforeDelivery === 'true' ? 'true' : 'false']);
    }
    if (body.blockCancelAfterDelivery !== undefined) {
      entries.push(['blockCancelAfterDelivery', body.blockCancelAfterDelivery === true || body.blockCancelAfterDelivery === 'true' ? 'true' : 'false']);
    }

    for (const [key, value] of entries) {
      await prisma.radiologySetting.upsert({
        where: { companyId_key: { companyId, key } },
        update: { value },
        create: { companyId, key, value },
      });
    }

    res.json({ success: true, data: await getRadiologyGuards(prisma, companyId) });
  } catch (error) {
    console.error('Error updating radiology guards:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحراسات' });
  }
};

const listRiskFlags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const flags = await getRadiologyRiskFlags(getSharedPrismaClient(), companyId);
    res.json({ success: true, data: flags });
  } catch (error) {
    console.error('Error listing radiology risk flags:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب مؤشرات الخطر الطبي' });
  }
};

const updateRiskFlags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const flags = await saveRadiologyRiskFlags(getSharedPrismaClient(), companyId, req.body?.flags);
    res.json({ success: true, data: flags });
  } catch (error) {
    console.error('Error updating radiology risk flags:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث مؤشرات الخطر الطبي' });
  }
};

const listDeliverySettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const settings = await getRadiologyDeliverySettings(getSharedPrismaClient(), companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error listing radiology delivery settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التوصيل' });
  }
};

const updateDeliverySettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    const entries = [];
    if (body.deliverSmsPatient !== undefined) {
      entries.push(['deliverSmsPatient', body.deliverSmsPatient === true || body.deliverSmsPatient === 'true' ? 'true' : 'false']);
    }
    if (body.notifyReferringDoctor !== undefined) {
      entries.push(['notifyReferringDoctor', body.notifyReferringDoctor === true || body.notifyReferringDoctor === 'true' ? 'true' : 'false']);
    }

    for (const [key, value] of entries) {
      await prisma.radiologySetting.upsert({
        where: { companyId_key: { companyId, key } },
        update: { value },
        create: { companyId, key, value },
      });
    }

    res.json({ success: true, data: await getRadiologyDeliverySettings(prisma, companyId) });
  } catch (error) {
    console.error('Error updating radiology delivery settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التوصيل' });
  }
};

module.exports = { listSettings, updateSettings, listGuards, updateGuards, listRiskFlags, updateRiskFlags, listDeliverySettings, updateDeliverySettings };
