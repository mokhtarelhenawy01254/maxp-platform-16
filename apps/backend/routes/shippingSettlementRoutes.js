const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const shippingSettlementController = require('../controller/shippingSettlementController');

const SETTLEMENT_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/summary', verifyToken.authenticateToken, verifyToken.requireRole(SETTLEMENT_ROLES), shippingSettlementController.getSummary);
router.get('/orders', verifyToken.authenticateToken, verifyToken.requireRole(SETTLEMENT_ROLES), shippingSettlementController.listOrders);
router.post('/settle', verifyToken.authenticateToken, verifyToken.requireRole(SETTLEMENT_ROLES), shippingSettlementController.settle);
router.post('/unsettle', verifyToken.authenticateToken, verifyToken.requireRole(SETTLEMENT_ROLES), shippingSettlementController.unsettle);

module.exports = router;
