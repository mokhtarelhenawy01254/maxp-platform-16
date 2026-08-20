const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ctrl = require('../controller/storePromotionController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Management routes require coupons-pro
router.get('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), ctrl.getPromotion);
router.post('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), ctrl.upsertPromotion);
router.delete('/', verifyToken.authenticateToken, checkAppAccess('coupons-pro'), ctrl.deletePromotion);

// Public route for storefront
router.get('/:companyId', ctrl.getPublicPromotion);

const calculateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'طلبات كثيرة، حاولي مرة تانية بعد دقيقة' },
});
// Public calculation used at checkout
router.post('/calculate', calculateLimiter, ctrl.calculateDiscount);

module.exports = router;
