const express = require('express');
const router = express.Router();
const telephonyService = require('../services/telephonyService');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) =>
  req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

/**
 * فحص حالة اتصال هاتف الموظف (Presence Check)
 */
router.get('/device/presence', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة أو المستخدم مفقود' });
    }

    const presence = await telephonyService.getDevicePresence(companyId, userId);
    res.json({ success: true, data: presence });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * تسجيل هاتف الموظف أو إرسال نبض اتصال دوري (Heartbeat)
 */
router.post('/device/heartbeat', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    const { deviceId, deviceName, socketId, appVersion, socketConnected } = req.body || {};

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'معرف الجهاز (deviceId) مطلوب' });
    }

    const device = await telephonyService.registerOrHeartbeatDevice({
      companyId,
      userId,
      deviceId,
      deviceName,
      socketId,
      appVersion,
      socketConnected
    });

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * بدء مكالمة صادرة بنقرة واحدة من الكمبيوتر (Outbound Click-to-Call)
 */
router.post('/initiate', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'رقم أو معرف الطلب مطلوب' });
    }

    const result = await telephonyService.initiateCall({
      companyId,
      userId,
      orderId
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * إنهاء وتوثيق المكالمة من تطبيق الموبايل (Complete Call)
 */
router.post('/complete', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    const { sessionId, durationSeconds, callStatus, callerPhone, result, notes } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'معرف الجلسة (sessionId) مطلوب' });
    }

    const log = await telephonyService.completeCall({
      companyId,
      userId,
      sessionId,
      durationSeconds,
      callStatus,
      callerPhone,
      result,
      notes
    });

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * استرجاع سجل مكالمات طلب معين
 */
router.get('/orders/:orderId/logs', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { orderId } = req.params;

    const logs = await telephonyService.getOrderCallLogs({
      companyId,
      orderId
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
