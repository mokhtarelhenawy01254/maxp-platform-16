const express = require('express');
const router = express.Router();
const promotionSettingsController = require('../controller/promotionSettingsController');
const verifyToken = require("../utils/verifyToken");

/**
 * 🎯 Routes لإدارة إعدادات الترويج (الشحن المجاني)
 */

// Public route for storefront consumption
router.get('/:companyId', promotionSettingsController.getPublicPromotionSettings);

// Protected routes (تحتاج مصادقة)
router.get('/', verifyToken.authenticateToken, promotionSettingsController.getPromotionSettings);
router.post('/', verifyToken.authenticateToken, promotionSettingsController.updatePromotionSettings);
router.put('/', verifyToken.authenticateToken, promotionSettingsController.updatePromotionSettings);
router.post('/reset', verifyToken.authenticateToken, promotionSettingsController.resetPromotionSettings);

module.exports = router;
