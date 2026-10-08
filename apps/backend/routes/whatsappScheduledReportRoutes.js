/**
 * 📊 WhatsApp Scheduled Report Routes
 * مسارات إدارة ومعاينة وإرسال التقارير المجدولة عبر الواتساب
 */

const express = require('express');
const router = express.Router();
const scheduledReportController = require('../controller/whatsappScheduledReportController');
const { authenticateToken, requireCompanyAccess } = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// تطبيق حماية المصادقة وصلاحيات الشركة واشتراك الواتساب على جميع المسارات
router.use(authenticateToken);
router.use(requireCompanyAccess);
router.use(checkAppAccess('whatsapp-business'));

// جلب إعدادات التقارير المجدولة
router.get('/configs', scheduledReportController.getConfigs);

// حفظ أو تحديث إعداد تقرير
router.post('/configs', scheduledReportController.upsertConfig);

// حذف إعداد تقرير
router.delete('/configs/:id', scheduledReportController.deleteConfig);

// توليد معاينة حية للتقرير دون إرسال
router.post('/preview', scheduledReportController.previewReport);

// إرسال تقرير تجريبي فوري
router.post('/test-send', scheduledReportController.sendTestReport);

module.exports = router;
