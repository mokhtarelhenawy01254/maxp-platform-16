const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const supplierController = require('../controller/supplierController');
const purchaseOrderController = require('../controller/purchaseOrderController');
const purchaseInvoiceController = require('../controller/purchaseInvoiceController');
const supplierPaymentController = require('../controller/supplierPaymentController');
const procurementReportsController = require('../controller/procurementReportsController');
const procurementSettingsController = require('../controller/procurementSettingsController');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { requirePermission } = require('../middleware/rbacMiddleware');

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('procurement-pro'));
router.use(requirePermission('procurement.view'));

// Settings
router.get('/settings', procurementSettingsController.getSettings);
router.put('/settings', requirePermission('procurement.suppliers.manage'), procurementSettingsController.updateSettings);

// Suppliers
router.post('/suppliers', requirePermission('procurement.suppliers.manage'), supplierController.createSupplier);
router.get('/suppliers', supplierController.getAllSuppliers);
router.post('/suppliers/recalculate-all', requirePermission('procurement.suppliers.manage'), supplierController.recalculateAllSuppliersBalance);
router.post('/suppliers/:id/recalculate-balance', requirePermission('procurement.suppliers.manage'), supplierController.recalculateSingleSupplierBalance);
router.get('/suppliers/:id', supplierController.getSupplierById);
router.put('/suppliers/:id', requirePermission('procurement.suppliers.manage'), supplierController.updateSupplier);
router.delete('/suppliers/:id', requirePermission('procurement.suppliers.manage'), supplierController.deleteSupplier);
router.get('/suppliers/:id/stats', supplierController.getSupplierStats);

// Purchase Orders
router.get('/catalog-items', purchaseOrderController.getProcurementCatalogItems);
router.post('/purchase-orders', requirePermission('procurement.orders.create'), purchaseOrderController.createPurchaseOrder);
router.get('/purchase-orders', purchaseOrderController.getAllPurchaseOrders);
router.get('/purchase-orders/stats', purchaseOrderController.getPurchaseOrderStats);
router.get('/purchase-orders/:id', purchaseOrderController.getPurchaseOrderById);
router.put('/purchase-orders/:id', requirePermission('procurement.orders.create'), purchaseOrderController.updatePurchaseOrder);
router.post('/purchase-orders/:id/approve', requirePermission('procurement.orders.approve'), purchaseOrderController.approvePurchaseOrder);
router.post('/purchase-orders/:id/receive', requirePermission('procurement.orders.approve'), purchaseOrderController.receiveItems);
router.post('/purchase-orders/:id/cancel', requirePermission('procurement.orders.approve'), purchaseOrderController.cancelPurchaseOrder);
router.delete('/purchase-orders/:id', requirePermission('procurement.orders.approve'), purchaseOrderController.deletePurchaseOrder);

// Purchase Invoices
router.post('/purchase-invoices', requirePermission('procurement.orders.approve'), purchaseInvoiceController.createPurchaseInvoice);
router.get('/purchase-invoices', purchaseInvoiceController.getAllPurchaseInvoices);
router.get('/purchase-invoices/stats', purchaseInvoiceController.getPurchaseInvoiceStats);
router.get('/purchase-invoices/:id', purchaseInvoiceController.getPurchaseInvoiceById);
router.put('/purchase-invoices/:id', requirePermission('procurement.orders.approve'), purchaseInvoiceController.updatePurchaseInvoice);
router.delete('/purchase-invoices/:id', requirePermission('procurement.orders.approve'), purchaseInvoiceController.deletePurchaseInvoice);
router.post('/purchase-invoices/check-overdue', purchaseInvoiceController.checkOverdueInvoices);

// Supplier Payments
router.post('/supplier-payments', requirePermission('procurement.payments.manage'), supplierPaymentController.createSupplierPayment);
router.get('/supplier-payments', supplierPaymentController.getAllSupplierPayments);
router.get('/supplier-payments/stats', supplierPaymentController.getSupplierPaymentStats);
router.get('/supplier-payments/:id', supplierPaymentController.getSupplierPaymentById);
router.put('/supplier-payments/:id', requirePermission('procurement.payments.manage'), supplierPaymentController.updateSupplierPayment);
router.delete('/supplier-payments/:id', requirePermission('procurement.payments.manage'), supplierPaymentController.deleteSupplierPayment);

// Reports
router.get('/reports/dashboard', procurementReportsController.getProcurementDashboard);
router.get('/reports/suppliers', procurementReportsController.getSupplierReport);
router.get('/reports/purchase-orders', procurementReportsController.getPurchaseOrderReport);
router.get('/reports/invoices', procurementReportsController.getInvoiceReport);
router.get('/reports/payments', procurementReportsController.getPaymentReport);
router.get('/reports/products', procurementReportsController.getProductPurchaseReport);
router.get('/reports/aging', procurementReportsController.getAgingReport);

module.exports = router;
