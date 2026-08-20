const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const tiktokShopController = require('../controller/tiktokShopController');

router.get('/account', verifyToken.authenticateToken, tiktokShopController.getAccountStatus);
router.post('/account', verifyToken.authenticateToken, tiktokShopController.saveAccount);
router.post('/orders/sync', verifyToken.authenticateToken, tiktokShopController.syncOrders);
router.post('/products/sync', verifyToken.authenticateToken, tiktokShopController.syncProducts);

module.exports = router;
