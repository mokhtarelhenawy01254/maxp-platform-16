const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const customerWhatsAppController = require('../controller/customerWhatsAppController');
const occasionController = require('../controller/occasionController');
const verifyToken = require("../utils/verifyToken")
const { requireDbPermission } = require('../middleware/rbacMiddleware');

// ──────────────────────────────────────────────────
// 📢 WhatsApp Notifications (Smart Bulk)
// ──────────────────────────────────────────────────
// Public ping (no auth)
router.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Sessions
router.get('/whatsapp-notify/sessions', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getConnectedWhatsAppSessions);
router.get('/whatsapp-notify/refresh-sessions', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.refreshSessions);

// Customers & Products (for UI)
router.get('/whatsapp-notify/customers', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getCustomersWithPhones);
router.get('/whatsapp-notify/products', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getProductsForNotification);

// Audience preview (count before sending)
router.get('/whatsapp-notify/preview-audience', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.previewAudience);
router.get('/whatsapp-notify/preview-birthday-audience', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.previewBirthdayAudience);

// Smart bulk send (filter-based - NEW)
router.post('/whatsapp-notify/smart-send', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.sendSmartBulkNotification);
router.post('/whatsapp-notify/smart-send-birthday', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.sendBirthdayBulkNotification);

// 🎂 Birthday Automation & Tracking Endpoints
router.get('/whatsapp-notify/birthday-analytics', verifyToken.authenticateToken, customerWhatsAppController.getBirthdayAnalyticsReports);
router.get('/whatsapp-notify/birthday-automation/settings', verifyToken.authenticateToken, customerWhatsAppController.getBirthdayAutomationSettings);
router.post('/whatsapp-notify/birthday-automation/settings', verifyToken.authenticateToken, customerWhatsAppController.saveBirthdayAutomationSettings);
router.get('/whatsapp-notify/birthday-automation/today', verifyToken.authenticateToken, customerWhatsAppController.getTodayBirthdayTrack);
router.get('/whatsapp-notify/birthday-automation/upcoming', verifyToken.authenticateToken, customerWhatsAppController.getUpcomingBirthdaysTrack);
router.get('/whatsapp-notify/birthday-automation/missing', verifyToken.authenticateToken, customerWhatsAppController.getMissingBirthdaysTrack);
// (محذوف: stub مكرر كان بيرجع occasions:[] دايمًا ويمنع الوصول للـ controller الحقيقي)
router.post('/whatsapp-notify/birthday-automation/send-test', verifyToken.authenticateToken, customerWhatsAppController.sendTestBirthdayMessage);




// Campaign status tracking
router.get('/whatsapp-notify/campaign/:campaignId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getCampaignStatus);
router.delete('/whatsapp-notify/campaign/:campaignId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.stopCampaign);

// Campaign history (from DB)
router.get('/whatsapp-notify/campaigns/history', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getCampaignHistory);

// 🚀 إعدادات الإرسال التلقائي للمنتج الجديد (عروض المنتجات — واتساب فقط)
router.get('/whatsapp-notify/auto-send-settings', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getProductAutoSendSettings);
router.put('/whatsapp-notify/auto-send-settings', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.saveProductAutoSendSettings);

// 🎉 جدولة حملات المناسبات (أوتوماتيك)
router.post('/whatsapp-notify/occasions/schedule', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.scheduleOccasionCampaign);
router.get('/whatsapp-notify/occasions/scheduled', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getScheduledOccasionCampaigns);

// 🎉 إدارة المناسبات (إضافة/حذف/تعديل/نشر)
router.get('/whatsapp-notify/occasions', verifyToken.authenticateToken, requireDbPermission('customers.view'), occasionController.listOccasions);
router.post('/whatsapp-notify/occasions', verifyToken.authenticateToken, requireDbPermission('customers.view'), occasionController.createOccasion);
router.put('/whatsapp-notify/occasions/:id', verifyToken.authenticateToken, requireDbPermission('customers.view'), occasionController.updateOccasion);
router.delete('/whatsapp-notify/occasions/:id', verifyToken.authenticateToken, requireDbPermission('customers.view'), occasionController.deleteOccasion);
router.post('/whatsapp-notify/occasions/:id/publish', verifyToken.authenticateToken, requireDbPermission('customers.view'), occasionController.publishOccasion);

// Legacy manual send (kept for backward compat)
router.post('/whatsapp-notify/send', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.sendBulkWhatsAppNotification);

// ──────────────────────────────────────────────────
// 👤 Customer CRUD
// ──────────────────────────────────────────────────
router.get('/', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getAllCustomer);
router.post('/', verifyToken.authenticateToken, requireDbPermission('customers.create'), customerController.createCustomer); // ✅ إنشاء عميل جديد
router.get('/search', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.searchCustomers); // ✅ بحث متقدم

// 🔍 بحث سريع بالرقم (لصفحات الطلب اليدوي والطلب السريع) — لازم قبل /:customerId
router.get('/by-phone/:phone', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerLookupByPhone);
router.get('/export', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.exportCustomers); // ✅ تصدير CSV/JSON

router.post('/import', verifyToken.authenticateToken, requireDbPermission('customers.create'), customerController.importCustomersFromCSV); // 📥 Import customers

// 🔒 Delete routes now secured
router.delete('/cus', verifyToken.authenticateToken, requireDbPermission('customers.delete'), customerController.deleteAllCustomers);
router.delete('/con', verifyToken.authenticateToken, requireDbPermission('customers.delete'), customerController.deleteAllConversations);

// 🚫 Routes for blocking customers on Facebook pages
router.post('/block', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.blockCustomerOnPage);
router.post('/unblock', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.unblockCustomerOnPage);
router.get('/blocked/:pageId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getBlockedCustomersOnPage);
router.get('/block-status', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.checkCustomerBlockStatus);

// 🏷️ جلب الوسوم الفريدة (لازم يكون قبل /:customerId)
router.get('/tags/distinct', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getDistinctTags);

// 🏷️ إدارة الوسوم (إعادة تسمية / حذف عبر جميع العملاء)
router.put('/tags/rename', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.renameTag);
router.delete('/tags/:tagName', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.deleteTag);

// ⭐ إعادة حساب وتصنيف جميع عملاء الشركة
router.post('/recalculate-all-ratings', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.recalculateAllCustomerRatingsHandler);

// تفاصيل العميل
router.get('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerDetails);

// ⭐ إعادة حساب وتصنيف عميل محدد
router.post('/:customerId/recalculate-rating', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.recalculateCustomerRatingHandler);

// جلب طلبات العميل
router.get('/:customerId/orders', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerOrders);

// سجل نشاطات العميل
router.get('/:customerId/message-timeline', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerWhatsAppController.getCustomerMessageTimeline);
router.get('/:customerId/activity', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerActivity);

// 📝 ملاحظات العميل
router.get('/:customerId/notes', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerNotes);
router.post('/:customerId/notes', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.addCustomerNote);
router.delete('/notes/:noteId', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.deleteCustomerNote);

// 🗑️ حذف عميل محدد
router.delete('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.delete'), customerController.deleteCustomer);

// 🏷️ تحديث علامات العميل
router.put('/:customerId/tags', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.updateCustomerTags);

// ✏️ تحديث بيانات العميل
router.put('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.edit'), customerController.updateCustomer);

module.exports = router;
