const express = require('express');
const router = express.Router();
const ctrl = require('../controller/storePromotionController');
const verifyToken = require("../utils/verifyToken");

router.get('/', verifyToken.authenticateToken, ctrl.getPromotion);
router.post('/', verifyToken.authenticateToken, ctrl.upsertPromotion);
router.delete('/', verifyToken.authenticateToken, ctrl.deletePromotion);

router.get('/:companyId', ctrl.getPublicPromotion);
router.post('/calculate', ctrl.calculateDiscount);

module.exports = router;
