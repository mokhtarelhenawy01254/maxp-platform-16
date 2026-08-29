/**
 * 🎁 Customer Loyalty Routes
 * مسارات API لنظام ولاء العملاء
 */

const express = require('express');
const router = express.Router();
const customerLoyaltyController = require('../controller/customerLoyaltyController');
const verifyToken = require("../utils/verifyToken");

// تطبيق المصادقة على جميع المسارات
router.use(verifyToken.authenticateToken);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 برامج الولاء - Loyalty Programs
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع برامج الولاء
router.get('/programs',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getPrograms
);

// جلب برنامج ولاء محدد
router.get('/programs/:id',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getProgramById
);

// إنشاء برنامج ولاء جديد
router.post('/programs',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.createProgram
);

// تحديث برنامج ولاء
router.put('/programs/:id',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateProgram
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 المستويات - Tiers
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع المستويات
router.get('/tiers',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getTiers
);

// إنشاء مستوى جديد
router.post('/tiers',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.createTier
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 سجلات العملاء - Customer Records
// ═══════════════════════════════════════════════════════════════════════════════

// تعديل مستوى
router.put('/tiers/:id',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateTier
);

// حذف مستوى
router.delete('/tiers/:id',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.deleteTier
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 سجلات العملاء - Customer Records
// ═══════════════════════════════════════════════════════════════════════════════

// جلب سجلات ولاء العملاء
router.get('/customers',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCustomerRecords
);

// إضافة عميل إلى برنامج ولاء
router.post('/enroll',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.enrollCustomer
);

// إضافة نقاط للعميل
router.post('/add-points',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.addPoints
);

// استبدال النقاط
router.post('/redeem-points',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.redeemPoints
);

// تعديل النقاط (إضافة/خصم يدوياً)
router.post('/adjust-points',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.adjustPoints
);

// إعدادات المستويات (طريقة الحساب + الفئات)
router.get('/tier-config',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getTierConfig
);

router.put('/tier-config',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateTierConfig
);

// نظام الولاء (اختيار: المستويات أو الخصم التلقائي)
router.get('/system-settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getSystemSettings
);

router.put('/system-settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateSystemSettings
);

// 🆕 إعدادات الولاء الموحّدة (مفاتيح تفعيل مستقلة: المستويات / الخصم التلقائي / الكاش باك + وضع دمج الخصم + حد أقصى)
router.get('/loyalty-config',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getLoyaltyConfig
);

router.put('/loyalty-config',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateLoyaltyConfig
);

// معالجة الكوبونات المنتهية (تحويلها لكاش باك) — يدوي
router.post('/vouchers/process-expired',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.processExpiredVouchers
);

// تحليلات نظام الولاء الحالي (الخصم التلقائي أو المستويات)
router.get('/system-analytics',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getSystemAnalytics
);

// إصدار الكوبونات الناقصة (backfill) للأوردرات المسلّمة القديمة
router.post('/vouchers/backfill',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.backfillVouchers
);

// تجاوز عميل (طريقة الحساب + المزايا المخصصة)
router.get('/customers/:customerId/tier-override',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCustomerTierOverride
);

router.put('/customers/:customerId/tier-override',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateCustomerTierOverride
);

// ملخص بوابة العميل (نقاط / خصومات / كاش باك / بيانات)
router.get('/customers/:customerId/portal-summary',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCustomerPortalSummary
);

// 💳 كارت عضوية العميل (بطاقة مستوى الولاء) — توليد/جلب
router.get('/customers/:customerId/card',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCustomerTierCard
);

// 📤 إرسال كارت العضوية للعميل عبر WhatsApp
router.post('/customers/:customerId/card/send',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.sendCustomerTierCard
);

// 🏆 إنشاء مستويات من قالب جاهز (Preset)
router.post('/tiers/preset',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.createTierPreset
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 جدول إشعارات العملاء (الولاء / الكاش باك / الجودة)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جدول الإشعارات
router.get('/notifications/schedule',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getNotificationSchedule
);

// تحديث صف من جدول الإشعارات
router.put('/notifications/schedule',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateNotificationSchedule
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 Cashback Settings (Global)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/cashback/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getCashbackSettings
);

router.put('/cashback/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateCashbackSettings
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏅 Points Settings (Global)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/points/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getPointsSettings
);

router.put('/points/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updatePointsSettings
);

// 🎯 إعدادات إعادة الاستهداف (حد السكوت + مفاتيح تفعيل الحلقات)
router.get('/re-engagement/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getReEngagementSettings
);

router.put('/re-engagement/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateReEngagementSettings
);

// 🎯 عدد العملاء المطابق لحلقات إعادة الاستهداف
router.get('/re-engagement/counts',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getReEngagementCounts
);

// 🎯 قائمة العملاء المطابقين (drill-down)
// 🕐 الرسائل الدورية الثابتة (Retention Cadence): منتج كل 10 أيام / رصيد كل 15 / إحالة كل 30 / مستوى كل 30
router.get('/retention-cadence/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getRetentionCadenceSettings
);

router.put('/retention-cadence/settings',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.updateRetentionCadenceSettings
);

router.get('/re-engagement/customers',
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  customerLoyaltyController.getReEngagementCustomers
);

module.exports = router;
