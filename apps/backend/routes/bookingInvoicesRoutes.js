const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingInvoicesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllInvoices);
router.get('/:id', verifyToken.authenticateToken, controller.getInvoiceById);
router.post('/', verifyToken.authenticateToken, controller.createInvoice);
router.put('/:id', verifyToken.authenticateToken, controller.updateInvoice);
router.post('/:id/payments', verifyToken.authenticateToken, controller.addPayment);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteInvoice);

module.exports = router;
