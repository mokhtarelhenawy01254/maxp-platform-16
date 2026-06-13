const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const customerWhatsAppController = require('../controller/customerWhatsAppController');
const verifyToken = require("../utils/verifyToken")

// ──────────────────────────────────────────────────
// 📢 WhatsApp Notifications (Smart Bulk)
// ──────────────────────────────────────────────────
// Public ping (no auth)
router.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Sessions
router.get('/whatsapp-notify/sessions', verifyToken.authenticateToken, customerWhatsAppController.getConnectedWhatsAppSessions);
router.get('/whatsapp-notify/refresh-sessions', verifyToken.authenticateToken, customerWhatsAppController.refreshSessions);

// Customers & Products (for UI)
router.get('/whatsapp-notify/customers', verifyToken.authenticateToken, customerWhatsAppController.getCustomersWithPhones);
router.get('/whatsapp-notify/products', verifyToken.authenticateToken, customerWhatsAppController.getProductsForNotification);

// Audience preview (count before sending)
router.get('/whatsapp-notify/preview-audience', verifyToken.authenticateToken, customerWhatsAppController.previewAudience);
router.get('/whatsapp-notify/preview-birthday-audience', verifyToken.authenticateToken, customerWhatsAppController.previewBirthdayAudience);

// Smart bulk send (filter-based - NEW)
router.post('/whatsapp-notify/smart-send', verifyToken.authenticateToken, customerWhatsAppController.sendSmartBulkNotification);
router.post('/whatsapp-notify/smart-send-birthday', verifyToken.authenticateToken, customerWhatsAppController.sendBirthdayBulkNotification);

// Campaign status tracking
router.get('/whatsapp-notify/campaign/:campaignId', verifyToken.authenticateToken, customerWhatsAppController.getCampaignStatus);
router.delete('/whatsapp-notify/campaign/:campaignId', verifyToken.authenticateToken, customerWhatsAppController.stopCampaign);

// Campaign history (from DB)
router.get('/whatsapp-notify/campaigns/history', verifyToken.authenticateToken, customerWhatsAppController.getCampaignHistory);

// Legacy manual send (kept for backward compat)
router.post('/whatsapp-notify/send', verifyToken.authenticateToken, customerWhatsAppController.sendBulkWhatsAppNotification);

// ──────────────────────────────────────────────────
// 👤 Customer CRUD
// ──────────────────────────────────────────────────
router.get('/', verifyToken.authenticateToken, customerController.getAllCustomer);
router.post('/', verifyToken.authenticateToken, customerController.createCustomer); // ✅ إنشاء عميل جديد
router.get('/search', verifyToken.authenticateToken, customerController.searchCustomers); // ✅ بحث متقدم
router.get('/export', verifyToken.authenticateToken, customerController.exportCustomers); // ✅ تصدير CSV/JSON

router.post('/import', verifyToken.authenticateToken, customerController.importCustomersFromCSV); // 📥 Import customers

// 🔒 Delete routes now secured
router.delete('/cus', verifyToken.authenticateToken, customerController.deleteAllCustomers);
router.delete('/con', verifyToken.authenticateToken, customerController.deleteAllConversations);

// 🚫 Routes for blocking customers on Facebook pages
router.post('/block', verifyToken.authenticateToken, customerController.blockCustomerOnPage);
router.post('/unblock', verifyToken.authenticateToken, customerController.unblockCustomerOnPage);
router.get('/blocked/:pageId', verifyToken.authenticateToken, customerController.getBlockedCustomersOnPage);
router.get('/block-status', verifyToken.authenticateToken, customerController.checkCustomerBlockStatus);

// تفاصيل العميل
router.get('/:customerId', verifyToken.authenticateToken, customerController.getCustomerDetails);

// جلب طلبات العميل
router.get('/:customerId/orders', verifyToken.authenticateToken, customerController.getCustomerOrders);

// سجل نشاطات العميل
router.get('/:customerId/activity', verifyToken.authenticateToken, customerController.getCustomerActivity);

// 📝 ملاحظات العميل
router.get('/:customerId/notes', verifyToken.authenticateToken, customerController.getCustomerNotes);
router.post('/:customerId/notes', verifyToken.authenticateToken, customerController.addCustomerNote);
router.delete('/notes/:noteId', verifyToken.authenticateToken, customerController.deleteCustomerNote);

// 🗑️ حذف عميل محدد
router.delete('/:customerId', verifyToken.authenticateToken, customerController.deleteCustomer);

// 🏷️ تحديث علامات العميل
router.put('/:customerId/tags', verifyToken.authenticateToken, customerController.updateCustomerTags);

// ✏️ تحديث بيانات العميل
router.put('/:customerId', verifyToken.authenticateToken, customerController.updateCustomer);

module.exports = router;
