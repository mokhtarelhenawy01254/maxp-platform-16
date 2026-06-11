/**
 * 🔔 WhatsApp Notification Routes
 * مسارات إشعارات WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappNotificationController = require('../controller/whatsappNotificationController');
const { requireAuth } = require('../middleware/auth');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// All notification routes require whatsapp-notifications app access
router.use(requireAuth);
router.use(checkAppAccess('whatsapp-notifications'));

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب إعدادات الإشعارات
router.get('/settings', whatsappNotificationController.getNotificationSettings);

// تحديث إعدادات الإشعارات
router.put('/settings', whatsappNotificationController.updateNotificationSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 القوالب
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع القوالب
router.get('/templates', whatsappNotificationController.getTemplates);

// جلب قالب واحد
router.get('/templates/:id', whatsappNotificationController.getTemplate);

// إنشاء قالب جديد
router.post('/templates', whatsappNotificationController.createTemplate);

// تحديث قالب
router.put('/templates/:id', whatsappNotificationController.updateTemplate);

// حذف قالب
router.delete('/templates/:id', whatsappNotificationController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 السجلات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب سجل الإشعارات
router.get('/logs', whatsappNotificationController.getNotificationLogs);

// جلب إحصائيات الإشعارات
router.get('/stats', whatsappNotificationController.getNotificationStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال إشعار يدوي
router.post('/send', whatsappNotificationController.sendManualNotification);

// إرسال إشعار اختباري
// إرسال إشعار اختباري
router.post('/test', whatsappNotificationController.sendTestNotification);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تفضيلات العملاء
// ═══════════════════════════════════════════════════════════════════════════════

// جلب تفضيلات العميل
router.get('/preferences/customer/:customerId', whatsappNotificationController.getCustomerPreferences);

// تحديث تفضيلات العميل
router.put('/preferences/customer/:customerId', whatsappNotificationController.updateCustomerPreferences);

module.exports = router;
