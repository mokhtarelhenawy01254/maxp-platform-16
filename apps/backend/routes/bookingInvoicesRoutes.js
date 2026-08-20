const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingInvoicesController');
const verifyToken = require('../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

// Cashier shifts (must be registered before generic :id routes)
router.post('/cashier-shifts', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.openCashierShift);
router.get('/cashier-shifts/current', verifyToken.authenticateToken, controller.getCurrentCashierShift);
router.get('/cashier-shifts/balance', verifyToken.authenticateToken, controller.getCashierShiftBalance);
router.put('/cashier-shifts/:id/close', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.closeCashierShift);

// Invoices
router.get('/', verifyToken.authenticateToken, controller.getAllInvoices);
router.post('/from-appointment/:appointmentId', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.createInvoiceFromAppointment);
router.get('/:id', verifyToken.authenticateToken, controller.getInvoiceById);
router.post('/', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.createInvoice);
router.put('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.updateInvoice);
router.post('/:id/payments', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.addPayment);
router.post('/:id/payback', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.paybackPayment);
router.delete('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.deleteInvoice);

module.exports = router;
