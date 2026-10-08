/**
 * 🔔 WhatsApp Notification Routes
 * مسارات إشعارات WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappNotificationController = require('../controller/whatsappNotificationController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('whatsapp-business'));

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب إعدادات الإشعارات
router.get('/settings', verifyToken.authenticateToken, whatsappNotificationController.getNotificationSettings);

// تحديث إعدادات الإشعارات
router.put('/settings', verifyToken.authenticateToken, whatsappNotificationController.updateNotificationSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 القوالب
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع القوالب
router.get('/templates', verifyToken.authenticateToken, whatsappNotificationController.getTemplates);

// جلب قوالب ميتا المعتمدة المتاحة للربط (قبل /templates/:id)
router.get('/templates/meta-available', verifyToken.authenticateToken, whatsappNotificationController.listAvailableMetaTemplates);

// مصير الإشعار المتوقع لكل قالب (قبل /templates/:id — مش :id)
router.get('/templates/delivery-preview', verifyToken.authenticateToken, whatsappNotificationController.getTemplatesDeliveryPreview);

// إرسال قوالب الطلبات الجاهزة دفعة واحدة إلى ميتا (قبل /templates/:id)
router.post('/templates/batch-publish-meta', verifyToken.authenticateToken, whatsappNotificationController.batchPublishOrderTemplatesToMeta);

// ربط قالب محلي بقالب ميتا معتمد موجود
router.post('/templates/:id/bind-meta', verifyToken.authenticateToken, whatsappNotificationController.bindMetaTemplate);

// جلب قالب واحد
router.get('/templates/:id', verifyToken.authenticateToken, whatsappNotificationController.getTemplate);

// إنشاء قالب جديد
router.post('/templates', verifyToken.authenticateToken, whatsappNotificationController.createTemplate);

// تحديث قالب
router.put('/templates/:id', verifyToken.authenticateToken, whatsappNotificationController.updateTemplate);

// حذف قالب
router.delete('/templates/:id', verifyToken.authenticateToken, whatsappNotificationController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 السجلات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب سجل الإشعارات
router.get('/logs', verifyToken.authenticateToken, whatsappNotificationController.getNotificationLogs);

// 📊 تقرير يومي لحالات الطلبات: من اتإشعر، بأي قالب (ميتا/عادي)، وأي حالة التوصيل
router.get('/status-report', verifyToken.authenticateToken, whatsappNotificationController.getStatusReport);

// جلب إحصائيات الإشعارات
router.get('/template-stats', verifyToken.authenticateToken, whatsappNotificationController.getTemplateStats);
router.get('/stats', verifyToken.authenticateToken, whatsappNotificationController.getNotificationStats);

// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3): إحصائيات طابور الإشعارات
router.get('/queue-stats', verifyToken.authenticateToken, whatsappNotificationController.getNotificationQueueStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال إشعار يدوي
router.post('/send', verifyToken.authenticateToken, whatsappNotificationController.sendManualNotification);

// إرسال إشعار اختباري
// إرسال إشعار اختباري
router.post('/test', verifyToken.authenticateToken, whatsappNotificationController.sendTestNotification);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تفضيلات العملاء
// ═══════════════════════════════════════════════════════════════════════════════

// جلب تفضيلات العميل
router.get('/preferences/customer/:customerId', verifyToken.authenticateToken, whatsappNotificationController.getCustomerPreferences);

// تحديث تفضيلات العميل
router.put('/preferences/customer/:customerId', verifyToken.authenticateToken, whatsappNotificationController.updateCustomerPreferences);

// ═══════════════════════════════════════════════════════════════════════════════
// ☁️ نشر وإرسال قوالب ميتا
// ═══════════════════════════════════════════════════════════════════════════════

// نشر قالب محلي على ميتا
router.post('/templates/:id/publish', verifyToken.authenticateToken, whatsappNotificationController.publishTemplateToMeta);

// إعادة إرسال قالب مربوط لميتا للمراجعة بعد التعديل
router.post('/templates/:id/resubmit-meta', verifyToken.authenticateToken, whatsappNotificationController.resubmitMetaTemplate);

// مزامنة حالة القوالب مع ميتا
router.post('/templates/sync-status', verifyToken.authenticateToken, whatsappNotificationController.syncTemplateStatuses);

module.exports = router;
