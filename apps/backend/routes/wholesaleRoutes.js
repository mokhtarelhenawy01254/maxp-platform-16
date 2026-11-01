const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const ctrl = require('../controller/wholesaleController');

router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

// Price Lists
router.get('/price-lists', ctrl.listPriceLists);
router.get('/price-lists/:id', ctrl.getPriceList);
router.post('/price-lists', ctrl.createPriceList);
router.put('/price-lists/:id', ctrl.updatePriceList);
router.delete('/price-lists/:id', ctrl.deletePriceList);

// Price List Items
router.post('/price-lists/:id/items', ctrl.addPriceListItem);
router.delete('/price-lists/:id/items/:itemId', ctrl.removePriceListItem);

// Wholesale Customers
router.get('/customers', ctrl.listWholesaleCustomers);
router.get('/customers/:id', ctrl.getWholesaleCustomer);
router.post('/customers', ctrl.createWholesaleCustomer);
router.put('/customers/:id', ctrl.updateWholesaleCustomer);
router.get('/customers/:id/prices', ctrl.getCustomerPrices);
router.get('/customers/:id/orders', ctrl.getWholesaleCustomerOrders);

// Price Resolution
router.get('/resolve-price', ctrl.resolvePrice);

// Price List ↔ Customer Assignment
router.post('/customers/:customerId/assign-price-list', ctrl.assignPriceList);
router.delete('/customers/:customerId/price-lists/:priceListId', ctrl.removePriceListAssignment);

// Transactions
router.post('/transactions', ctrl.recordTransaction);
router.get('/customers/:customerId/transactions', ctrl.getTransactions);

// Statement
router.get('/customers/:customerId/statement', ctrl.generateStatement);

// Dashboard
router.get('/dashboard', ctrl.dashboard);

// Reports
router.get('/debts/aging', ctrl.debtAgingReport);

// Daily Workspace Queue & Actions (B2B Workspace)
router.get('/manage/queue', ctrl.getManageQueue);
router.post('/manage/orders/:orderId/confirm', ctrl.confirmOrder);
router.post('/orders/:orderId/confirm', ctrl.confirmOrder);
router.post('/manage/distributors/:id/suspend', ctrl.suspendDistributor);
router.post('/customers/:id/suspend', ctrl.suspendDistributor);
router.post('/manage/distributors/:id/resume', ctrl.resumeDistributor);
router.post('/customers/:id/resume', ctrl.resumeDistributor);

module.exports = router;
