const express = require('express');
const router = express.Router();
const checkoutFormSettingsController = require('../controller/checkoutFormSettingsController');
const { requireAuth } = require('../middleware/auth');

/**
 * 📋 Routes لإدارة إعدادات فورم الشيك أوت
 */

// ✅ Routes محمية (تتطلب مصادقة)

/**
 * GET /api/checkout-form-settings
 * جلب إعدادات فورم الشيك أوت للشركة
 */
router.get('/', requireAuth, checkoutFormSettingsController.getCheckoutFormSettings);

/**
 * POST /api/checkout-form-settings
 * تحديث إعدادات فورم الشيك أوت
 */
router.post('/', requireAuth, checkoutFormSettingsController.updateCheckoutFormSettings);

/**
 * PUT /api/checkout-form-settings
 * تحديث إعدادات فورم الشيك أوت (بديل لـ POST)
 */
router.put('/', requireAuth, checkoutFormSettingsController.updateCheckoutFormSettings);

/**
 * POST /api/checkout-form-settings/reset
 * إعادة تعيين الإعدادات للقيم الافتراضية
 */
router.post('/reset', requireAuth, checkoutFormSettingsController.resetCheckoutFormSettings);

// Public storefront access (mounted in server.js at /api/v1/public/checkout-form-settings)
router.get('/:companyId', checkoutFormSettingsController.getPublicCheckoutFormSettings);

module.exports = router;
