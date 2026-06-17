const express = require('express');
const router = express.Router();
const checkoutFormSettingsController = require('../controller/checkoutFormSettingsController');
const verifyToken = require("../utils/verifyToken");

/**
 * 📋 Routes لإدارة إعدادات فورم الشيك أوت
 */

// ✅ Routes محمية (تتطلب مصادقة)

/**
 * GET /api/checkout-form-settings
 * جلب إعدادات فورم الشيك أوت للشركة
 */
router.get('/', verifyToken.authenticateToken, checkoutFormSettingsController.getCheckoutFormSettings);

/**
 * POST /api/checkout-form-settings
 * تحديث إعدادات فورم الشيك أوت
 */
router.post('/', verifyToken.authenticateToken, checkoutFormSettingsController.updateCheckoutFormSettings);

/**
 * PUT /api/checkout-form-settings
 * تحديث إعدادات فورم الشيك أوت (بديل لـ POST)
 */
router.put('/', verifyToken.authenticateToken, checkoutFormSettingsController.updateCheckoutFormSettings);

/**
 * POST /api/checkout-form-settings/reset
 * إعادة تعيين الإعدادات للقيم الافتراضية
 */
router.post('/reset', verifyToken.authenticateToken, checkoutFormSettingsController.resetCheckoutFormSettings);

// Public storefront access (mounted in server.js at /api/v1/public/checkout-form-settings)
router.get('/:companyId', checkoutFormSettingsController.getPublicCheckoutFormSettings);

module.exports = router;
