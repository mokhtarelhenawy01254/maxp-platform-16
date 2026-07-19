const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.0d856b33')./middleware/activityLoggeri18n.t('msg.0441fa34')express').Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddlewarei18n.t('msg.35e4b9fe')/login', 
  logAuth('LOGIN', i18n.t('msg.022cf89fi18n.t('msg.eed8d29e')/logout', 
  protect, 
  logAuth('LOGOUT', i18n.t('msg.791d97eci18n.t('msg.90930738')/change-password', 
  protect, 
  logAuth('UPDATE', i18n.t('msg.b882bfc4i18n.t('msg.746f6e86')/reset-password', 
  logAuth('UPDATE', i18n.t('msg.2831a883i18n.t('msg.acc067a0')express').Router();
const { protect } = require('../middleware/authMiddleware');

// ===== Campaigns =====
router.post('/campaigns', 
  protect, 
  logAds('CREATE', 'Campaign'), 
  createCampaign
);

router.put('/campaigns/:id', 
  protect, 
  logAds('UPDATE', 'Campaign'), 
  updateCampaign
);

router.delete('/campaigns/:id', 
  protect, 
  logAds('DELETE', 'Campaign'), 
  deleteCampaign
);

router.post('/campaigns/:id/activate', 
  protect, 
  logAds('ACTIVATE', 'Campaign'), 
  activateCampaign
);

router.post('/campaigns/:id/deactivate', 
  protect, 
  logAds('DEACTIVATE', 'Campaign'), 
  deactivateCampaign
);

// ===== Ad Sets =====
router.post('/adsets', 
  protect, 
  logAds('CREATE', 'AdSet'), 
  createAdSet
);

router.put('/adsets/:id', 
  protect, 
  logAds('UPDATE', 'AdSet'), 
  updateAdSet
);

router.delete('/adsets/:id', 
  protect, 
  logAds('DELETE', 'AdSet'), 
  deleteAdSet
);

// ===== Ads =====
router.post('/ads', 
  protect, 
  logAds('CREATE', 'Ad'), 
  createAd
);

router.put('/ads/:id', 
  protect, 
  logAds('UPDATE', 'Ad'), 
  updateAd
);

router.delete('/ads/:id', 
  protect, 
  logAds('DELETE', 'Adi18n.t('msg.c4f51c60')/conversations', 
  protect, 
  logConversation('CREATE'), 
  createConversation
);

router.post('/conversations/:id/messages', 
  protect, 
  logConversation('SEND'), 
  sendMessage
);

router.put('/conversations/:id/ai/activate', 
  protect, 
  logConversation('ACTIVATE'), 
  activateAI
);

router.put('/conversations/:id/ai/deactivate', 
  protect, 
  logConversation('DEACTIVATE'), 
  deactivateAI
);

router.put('/conversations/:id/settings', 
  protect, 
  logConversation('UPDATEi18n.t('msg.f9fb1cf0')/payments', 
  protect, 
  logBilling('CREATE'), 
  createPayment
);

router.post('/wallet/recharge', 
  protect, 
  logBilling('CREATE'), 
  rechargeWallet
);

router.get('/invoices/:id', 
  protect, 
  logBilling('VIEW'), 
  getInvoice
);

router.get('/invoices/:id/export', 
  protect, 
  logBilling('EXPORT'), 
  exportInvoice
);

router.put('/payment-methods', 
  protect, 
  logBilling('UPDATEi18n.t('msg.1956f100')/tickets', 
  protect, 
  logSupport('CREATE', 'Ticket'), 
  createTicket
);

router.put('/tickets/:id', 
  protect, 
  logSupport('UPDATE', 'Ticket'), 
  updateTicket
);

router.post('/tickets/:id/reply', 
  protect, 
  logSupport('SEND', 'Ticket'), 
  replyToTicket
);

router.put('/tickets/:id/close', 
  protect, 
  logSupport('APPROVE', 'Ticket'), 
  closeTicket
);

router.post('/faq', 
  protect, 
  logSupport('CREATE', 'FAQ'), 
  createFAQ
);

router.put('/faq/:id', 
  protect, 
  logSupport('UPDATE', 'FAQi18n.t('msg.3269c0f8')/users', 
  protect, 
  logUser('CREATE'), 
  createUser
);

router.put('/users/:id', 
  protect, 
  logUser('UPDATE'), 
  updateUser
);

router.delete('/users/:id', 
  protect, 
  logUser('DELETE'), 
  deleteUser
);

router.put('/users/:id/activate', 
  protect, 
  logUser('ACTIVATE'), 
  activateUser
);

router.put('/users/:id/deactivate', 
  protect, 
  logUser('DEACTIVATE'), 
  deactivateUser
);

router.put('/users/:id/role', 
  protect, 
  logUser('UPDATEi18n.t('msg.54cc8562')/settings', 
  protect, 
  logSettings('UPDATE'), 
  updateSettings
);

router.put('/settings/company', 
  protect, 
  logCompany('UPDATE'), 
  updateCompanySettings
);

router.put('/settings/smart-replies', 
  protect, 
  logSettings('UPDATE'), 
  updateSmartReplySettings
);

router.put('/settings/notifications', 
  protect, 
  logSettings('UPDATEi18n.t('msg.231a848e')multer');
const upload = multer({ dest: 'uploads/' });

router.post('/upload', 
  protect, 
  upload.single('file'), 
  logFile('UPLOAD'), 
  uploadFile
);

router.get('/download/:id', 
  protect, 
  logFile('DOWNLOAD'), 
  downloadFile
);

router.delete('/files/:id', 
  protect, 
  logFile('DELETEi18n.t('msg.03e33c9b')/products', 
  protect, 
  logActivity({
    category: 'PRODUCTS',
    action: 'CREATE',
    targetType: 'Product',
    severity: 'MEDIUMi18n.t('msg.33cbb2e9')product', 'inventory', 'createi18n.t('msg.533de387')../models/ActivityLog');

async function deleteImportantData(req, res) {
  try {
    const data = await SomeModel.findById(req.params.id);
    
    if (!data) {
      return res.status(404).json({ error: i18n.t('msg.2bf6939ci18n.t('msg.d76b5970')DATA',
      action: 'DELETEi18n.t('msg.fe641ca8')CRITICAL',
      targetType: 'Data',
      targetId: req.params.id,
      targetName: data.name,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        reason: req.body.reason || i18n.t('msg.cd09c30d'),
        deletedData: {
          name: data.name,
          type: data.type,
          createdAt: data.createdAt
        }
      },
      tags: ['critical', 'delete', 'sensitive']
    });
    
    res.json({ 
      success: true, 
      message: i18n.t('msg.0e594191i18n.t('msg.69d2aa7f')DATA',
      action: 'DELETEi18n.t('msg.36e034dc')HIGHi18n.t('msg.9ef721bc')PRODUCTS',
      action: 'UPDATEi18n.t('msg.5bc7604b')HIGH',
      metadata: {
        ipAddress: req.ip,
        productsCount: productIds.length,
        updates: updates,
        modifiedCount: results.modifiedCount
      },
      tags: ['bulk', 'products', 'updatei18n.t('msg.be1c5e5d')/broadcast', 
  protect, 
  logActivity({
    category: 'CONVERSATIONS',
    action: 'SEND',
    targetType: 'Broadcast',
    severity: 'MEDIUMi18n.t('msg.bc42633d')broadcast', 'bulk-messagei18n.t('msg.bb7e2a54')/orders', 
  protect, 
  logActivity({
    category: 'ORDERS',
    action: 'CREATE',
    targetType: 'Order',
    severity: 'MEDIUMi18n.t('msg.2e7228a4')order', 'sales']
  }), 
  createOrder
);

router.put('/orders/:id/status', 
  protect, 
  logActivity({
    category: 'ORDERS',
    action: 'UPDATE',
    targetType: 'Order',
    severity: 'MEDIUMi18n.t('msg.70f9023c')order', 'status-change']
  }), 
  updateOrderStatus
);
*/

// ============================================
// ملاحظات مهمة:
// ============================================

/*
1. الـ Middleware يجب أن يكون قبل الـ Controller مباشرة
2. استخدم protect middleware قبل logActivity للتأكد من وجود user
3. الـ description يمكن أن يكون string أو function
4. getTargetId و getTargetName يستقبلون (req, res) بعد تنفيذ الـ Controller
5. severity يحدد مستوى الخطورة: LOW, MEDIUM, HIGH, CRITICAL
6. tags مفيدة للبحث والفلترة لاحقاً
7. لا تسجل بيانات حساسة (كلمات مرور، tokens، بيانات بطاقات)
8. استخدم التسجيل اليدوي للعمليات المعقدة أو الحرجة
*/

module.exports = {
  // يمكنك تصدير أي دوال مساعدة هنا إذا لزم الأمر
};
