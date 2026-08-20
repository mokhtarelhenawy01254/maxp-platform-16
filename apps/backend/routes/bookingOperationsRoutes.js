const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingOperationsController');
const verifyToken = require('../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/labels/unprinted', verifyToken.authenticateToken, controller.getUnprintedLabels);
router.get('/labels/printed', verifyToken.authenticateToken, controller.getPrintedLabels);
router.post('/labels', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.printLabel);
router.get('/deliveries', verifyToken.authenticateToken, controller.getDeliveries);
router.put('/deliveries/:id/ready', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.markReady);
router.put('/deliveries/:id/delivered', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.markDelivered);
router.get('/transactions', verifyToken.authenticateToken, controller.getTransactions);
router.post('/transactions', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.logTransaction);

module.exports = router;
