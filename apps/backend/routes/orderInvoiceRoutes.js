const express = require('express');
const router = express.Router();
const orderInvoiceController = require('../controller/orderInvoiceController');
const { requireAuth } = require('../middleware/auth');
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.getAllInvoices);

router.get('/stats', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceStats);

// Generate invoice for an order
router.post('/generate/:orderId', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.generateInvoice);

// Bulk generate invoices for multiple orders
router.post('/bulk-generate', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.bulkGenerateInvoices);

// Get invoice by order ID
router.get('/order/:orderId', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceByOrderId);

router.get('/number/:invoiceNumber', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceByNumber);

router.get('/:invoiceId', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.getInvoiceById);

router.put('/:invoiceId', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.updateInvoice);

router.put('/:invoiceId/payment-status', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.updatePaymentStatus);

router.post('/:invoiceId/print', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.markAsPrinted);

router.post('/:invoiceId/email', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.markAsEmailed);

router.delete('/:invoiceId', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceController.deleteInvoice);

module.exports = router;

