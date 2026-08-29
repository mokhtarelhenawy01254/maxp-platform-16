const express = require('express');
const router = express.Router();
const couponsController = require('../controller/couponsController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

/**
 * 🎟️ Coupons Routes
 * مسارات إدارة الكوبونات والخصومات
 */

// جميع المسارات تتطلب مصادقة
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

// ✅ الحصول على جميع الكوبونات (يتطلب coupons-pro)
router.get('/', checkAppAccess('coupons-pro'), couponsController.getCoupons);

// ✅ إحصائيات الكوبونات (يتطلب coupons-pro)
router.get('/stats', checkAppAccess('coupons-pro'), couponsController.getCouponStats);

// ✅ التحقق من صلاحية كوبون (مفتوح — يُستخدم عند إتمام الشراء)
router.post('/validate', couponsController.validateCoupon);

// ✅ تطبيق كوبون على طلب (مفتوح — يُستخدم عند إتمام الشراء)
router.post('/apply', couponsController.applyCoupon);

// ✅ الحصول على كوبون واحد (يتطلب coupons-pro)
router.get('/:id', checkAppAccess('coupons-pro'), couponsController.getCoupon);

// ✅ إنشاء كوبونات جماعية فريدة (Win-back)
router.post('/bulk/generate', checkAppAccess('coupons-pro'), couponsController.bulkGenerateCoupons);

// ✅ إنشاء كوبون جديد (يتطلب coupons-pro)
router.post('/', checkAppAccess('coupons-pro'), couponsController.createCoupon);

// ✅ تحديث كوبون (يتطلب coupons-pro)
router.put('/:id', checkAppAccess('coupons-pro'), couponsController.updateCoupon);

// ✅ حذف كوبون (يتطلب coupons-pro)
router.delete('/:id', checkAppAccess('coupons-pro'), couponsController.deleteCoupon);

module.exports = router;
