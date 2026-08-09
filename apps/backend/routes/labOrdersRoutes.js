const express = require('express');
const router = express.Router();
const controller = require('../controller/labOrdersController');
const verifyToken = require('../utils/verifyToken');
const { requireRole } = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllOrders);
router.get('/:id/pdf', verifyToken.authenticateToken, controller.getOrderPdf);
router.get('/:id', verifyToken.authenticateToken, controller.getOrderById);
router.post('/', verifyToken.authenticateToken, controller.createOrder);
router.put('/:id', verifyToken.authenticateToken, controller.updateOrder);
router.delete('/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteOrder);
router.put('/:id/results', verifyToken.authenticateToken, controller.enterResults);
router.put('/:id/review', verifyToken.requireRole(MANAGER_ROLES), controller.reviewOrder);
router.put('/:id/sign', verifyToken.requireRole(MANAGER_ROLES), controller.signOrder);
router.put('/:id/deliver', verifyToken.authenticateToken, controller.markDelivered);

module.exports = router;
