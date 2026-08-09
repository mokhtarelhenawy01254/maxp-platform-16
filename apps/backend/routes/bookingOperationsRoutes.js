const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingOperationsController');
const verifyToken = require('../utils/verifyToken');

router.get('/labels/unprinted', verifyToken.authenticateToken, controller.getUnprintedLabels);
router.get('/labels/printed', verifyToken.authenticateToken, controller.getPrintedLabels);
router.post('/labels', verifyToken.authenticateToken, controller.printLabel);
router.get('/deliveries', verifyToken.authenticateToken, controller.getDeliveries);
router.put('/deliveries/:id/ready', verifyToken.authenticateToken, controller.markReady);
router.put('/deliveries/:id/delivered', verifyToken.authenticateToken, controller.markDelivered);
router.get('/transactions', verifyToken.authenticateToken, controller.getTransactions);
router.post('/transactions', verifyToken.authenticateToken, controller.logTransaction);

module.exports = router;
