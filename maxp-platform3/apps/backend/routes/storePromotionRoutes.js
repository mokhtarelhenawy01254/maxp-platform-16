const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ctrl = require('../controller/storePromotionController');
const verifyToken = require("../utils/verifyToken");

router.get('/', verifyToken.authenticateToken, ctrl.getPromotion);
router.post('/', verifyToken.authenticateToken, ctrl.upsertPromotion);
router.delete('/', verifyToken.authenticateToken, ctrl.deletePromotion);

router.get('/:companyId', ctrl.getPublicPromotion);

const calculateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'طلبات كثيرة، حاولي مرة تانية بعد دقيقة' },
});
router.post('/calculate', calculateLimiter, ctrl.calculateDiscount);

module.exports = router;
