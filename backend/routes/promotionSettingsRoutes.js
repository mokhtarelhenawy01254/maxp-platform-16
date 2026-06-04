const express = require('express');
const router = express.Router();
const promotionSettingsController = require('../controller/promotionSettingsController');
const { requireAuth } = require('../middleware/auth');

/**
 * 🎯 Routes لإدارة إعدادات الترويج (الشحن المجاني)
 */

// Public route for storefront consumption
router.get('/:companyId', promotionSettingsController.getPublicPromotionSettings);

// Protected routes (تحتاج مصادقة)
router.get('/', requireAuth, promotionSettingsController.getPromotionSettings);
router.post('/', requireAuth, promotionSettingsController.updatePromotionSettings);
router.put('/', requireAuth, promotionSettingsController.updatePromotionSettings);
router.post('/reset', requireAuth, promotionSettingsController.resetPromotionSettings);

module.exports = router;
