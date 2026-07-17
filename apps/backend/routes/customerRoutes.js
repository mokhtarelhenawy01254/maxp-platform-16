const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const customerWhatsAppController = require('../controller/customerWhatsAppController');
const verifyToken = require("../utils/verifyToken")
const { requireDbPermission } = require('../middleware/rbacMiddleware');

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
router.get('/', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getAllCustomer);
router.post('/', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.createCustomer); // ✅ إنشاء عميل جديد
router.get('/search', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.searchCustomers); // ✅ بحث متقدم
router.get('/export', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.exportCustomers); // ✅ تصدير CSV/JSON

router.post('/import', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.importCustomersFromCSV); // 📥 Import customers

// 🔒 Delete routes now secured
router.delete('/cus', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.deleteAllCustomers);
router.delete('/con', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.deleteAllConversations);

// 🚫 Routes for blocking customers on Facebook pages
router.post('/block', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.blockCustomerOnPage);
router.post('/unblock', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.unblockCustomerOnPage);
router.get('/blocked/:pageId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getBlockedCustomersOnPage);
router.get('/block-status', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.checkCustomerBlockStatus);

// 🏷️ جلب الوسوم الفريدة (لازم يكون قبل /:customerId)
router.get('/tags/distinct', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getDistinctTags);

// تفاصيل العميل
router.get('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerDetails);

// جلب طلبات العميل
router.get('/:customerId/orders', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerOrders);

// سجل نشاطات العميل
router.get('/:customerId/activity', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerActivity);

// 📝 ملاحظات العميل
router.get('/:customerId/notes', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.getCustomerNotes);
router.post('/:customerId/notes', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.addCustomerNote);
router.delete('/notes/:noteId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.deleteCustomerNote);

// 🗑️ حذف عميل محدد
router.delete('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.deleteCustomer);

// 🏷️ تحديث علامات العميل
router.put('/:customerId/tags', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.updateCustomerTags);

// ✏️ تحديث بيانات العميل
router.put('/:customerId', verifyToken.authenticateToken, requireDbPermission('customers.view'), customerController.updateCustomer);

module.exports = router;
