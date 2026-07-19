const express = require('express');
const router = express.Router();
const orderInvoiceController = require('../controller/orderInvoiceController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.getAllInvoices);

router.get('/stats', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceStats);

// Generate invoice for an order
router.post('/generate/:orderId', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.generateInvoice);

// Bulk generate invoices for multiple orders
router.post('/bulk-generate', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.bulkGenerateInvoices);

// Get invoice by order ID
router.get('/order/:orderId', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceByOrderId);

router.get('/number/:invoiceNumber', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceByNumber);

router.get('/:invoiceId', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceById);

router.put('/:invoiceId', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.updateInvoice);

router.put('/:invoiceId/payment-status', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.updatePaymentStatus);

router.post('/:invoiceId/print', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.markAsPrinted);

router.post('/:invoiceId/email', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.markAsEmailed);

router.delete('/:invoiceId', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceController.deleteInvoice);

module.exports = router;

