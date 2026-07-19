/**
 * 🔔 WhatsApp Notification Routes
 * مسارات إشعارات WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappNotificationController = require('../controller/whatsappNotificationController');
const verifyToken = require("../utils/verifyToken");

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

// جلب إحصائيات الإشعارات
router.get('/stats', verifyToken.authenticateToken, whatsappNotificationController.getNotificationStats);

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

module.exports = router;
