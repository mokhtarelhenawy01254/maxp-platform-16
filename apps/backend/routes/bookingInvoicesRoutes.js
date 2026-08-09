const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingInvoicesController');
const verifyToken = require('../utils/verifyToken');

// Cashier shifts (must be registered before generic :id routes)
router.post('/cashier-shifts', verifyToken.authenticateToken, controller.openCashierShift);
router.get('/cashier-shifts/current', verifyToken.authenticateToken, controller.getCurrentCashierShift);
router.get('/cashier-shifts/balance', verifyToken.authenticateToken, controller.getCashierShiftBalance);
router.put('/cashier-shifts/:id/close', verifyToken.authenticateToken, controller.closeCashierShift);

// Invoices
router.get('/', verifyToken.authenticateToken, controller.getAllInvoices);
router.post('/from-appointment/:appointmentId', verifyToken.authenticateToken, controller.createInvoiceFromAppointment);
router.get('/:id', verifyToken.authenticateToken, controller.getInvoiceById);
router.post('/', verifyToken.authenticateToken, controller.createInvoice);
router.put('/:id', verifyToken.authenticateToken, controller.updateInvoice);
router.post('/:id/payments', verifyToken.authenticateToken, controller.addPayment);
router.post('/:id/payback', verifyToken.authenticateToken, controller.paybackPayment);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteInvoice);

module.exports = router;
