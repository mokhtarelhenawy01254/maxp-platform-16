const express = require('express');
const router = express.Router();
const telephonyService = require('../services/telephonyService');
const verifyToken = require('../utils/verifyToken');
const { createEndpointRateLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken.authenticateToken);

// مصدر الخطأ هو الخدمة: تحترم المسارات error.statusCode وتسقط لـ400 عند غيابه
const respondError = (res, error) => {
  res.status(error?.statusCode || 400).json({ success: false, message: error?.message || 'خطأ غير متوقع' });
};

const getCompanyId = (req) =>
  req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

/**
 * فحص حالة اتصال هاتف الموظف (Presence Check)
 */
router.get('/device/presence', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة أو المستخدم مفقود' });
    }

    const presence = await telephonyService.getDevicePresence(companyId, userId);
    res.json({ success: true, data: presence });
  } catch (error) {
    respondError(res, error);
  }
});

/**
 * استعلام سريع عن أي مكالمة نشطة حالياً للشركة/المستخدم (Active Call Watchdog)
 */
router.get('/active-call', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const call = await telephonyService.getActiveCall({ companyId, userId });
    res.json({ success: true, data: call });
  } catch (error) {
    respondError(res, error);
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
    respondError(res, error);
  }
});

/**
 * بدء مكالمة صادرة بنقرة واحدة من الكمبيوتر (Outbound Click-to-Call)
 */
router.post('/initiate', createEndpointRateLimiter('AGENT_ACTIONS'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?.id;
    const { orderId, targetPhone } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'رقم أو معرف الطلب مطلوب' });
    }

    const result = await telephonyService.initiateCall({
      companyId,
      userId,
      orderId,
      targetPhone
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`[Telephony] initiate failed for company=${req.user?.companyId} user=${req.user?.id} order=${req.body?.orderId}:`, error.message);
    respondError(res, error);
  }
});

/**
 * إنهاء وتوثيق المكالمة من تطبيق الموبايل (Complete Call)
 */
router.post('/complete', createEndpointRateLimiter('AGENT_ACTIONS'), async (req, res) => {
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
    respondError(res, error);
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
    respondError(res, error);
  }
});

module.exports = router;
