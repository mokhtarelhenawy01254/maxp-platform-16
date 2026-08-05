const express = require('express');
const router = express.Router();
const promotionSettingsController = require('../controller/promotionSettingsController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

/**
 * 🎯 Routes لإدارة إعدادات الترويج (الشحن المجاني)
 */

// Public route for storefront consumption
router.get('/:companyId', promotionSettingsController.getPublicPromotionSettings);

// Protected routes (تحتاج مصادقة + coupons-pro)
router.get('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), promotionSettingsController.getPromotionSettings);
router.post('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), promotionSettingsController.updatePromotionSettings);
router.put('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), promotionSettingsController.updatePromotionSettings);
router.post('/reset', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), promotionSettingsController.resetPromotionSettings);

module.exports = router;
