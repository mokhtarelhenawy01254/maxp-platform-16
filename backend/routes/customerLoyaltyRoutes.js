/**
 * 🎁 Customer Loyalty Routes
 * مسارات API لنظام ولاء العملاء
 */

const express = require('express');
const router = express.Router();
const customerLoyaltyController = require('../controller/customerLoyaltyController');
const { requireAuth, requireRole } = require('../middleware/auth');

// تطبيق المصادقة على جميع المسارات
router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 برامج الولاء - Loyalty Programs
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع برامج الولاء
router.get('/programs',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getPrograms
);

// جلب برنامج ولاء محدد
router.get('/programs/:id',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getProgramById
);

// إنشاء برنامج ولاء جديد
router.post('/programs',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.createProgram
);

// تحديث برنامج ولاء
router.put('/programs/:id',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateProgram
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 المستويات - Tiers
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع المستويات
router.get('/tiers',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getTiers
);

// إنشاء مستوى جديد
router.post('/tiers',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.createTier
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 سجلات العملاء - Customer Records
// ═══════════════════════════════════════════════════════════════════════════════

// تعديل مستوى
router.put('/tiers/:id',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateTier
);

// حذف مستوى
router.delete('/tiers/:id',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.deleteTier
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 سجلات العملاء - Customer Records
// ═══════════════════════════════════════════════════════════════════════════════

// جلب سجلات ولاء العملاء
router.get('/customers',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCustomerRecords
);

// إضافة عميل إلى برنامج ولاء
router.post('/enroll',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.enrollCustomer
);

// إضافة نقاط للعميل
router.post('/add-points',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.addPoints
);

// استبدال النقاط
router.post('/redeem-points',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.redeemPoints
);

// تعديل النقاط (إضافة/خصم يدوياً)
router.post('/adjust-points',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.adjustPoints
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 Cashback Settings
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/cashback/settings',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCashbackSettings
);

router.put('/cashback/settings',
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateCashbackSettings
);

module.exports = router;
