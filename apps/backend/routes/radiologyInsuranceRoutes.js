const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyInsuranceController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

// Studies insurance assignment
router.put('/studies/:id/insurance', verifyToken.requireRole(MANAGER_ROLES), controller.assignStudyInsurance);

// Insurance invoices
router.post('/insurance-invoices', verifyToken.requireRole(MANAGER_ROLES), controller.createInvoice);
router.get('/insurance-invoices', controller.listInvoices);
router.get('/insurance-invoices/:id', controller.getInvoice);
router.post('/insurance-invoices/:id/payment', verifyToken.requireRole(MANAGER_ROLES), controller.recordPayment);

// Insurance ledger + summary
router.get('/insurance-ledger', controller.listLedger);
router.post('/insurance-ledger', verifyToken.requireRole(MANAGER_ROLES), controller.createLedgerEntry);
router.get('/insurance-summary', controller.insuranceSummary);

// Entity prices (per-entity exam prices)
router.get('/entity-prices', controller.listEntityPrices);
router.post('/entity-prices', verifyToken.requireRole(MANAGER_ROLES), controller.setEntityPrice);
router.get('/entity-prices/summary', controller.listEntityPricesSummary);

// Insurance pre-authorization coverage check
router.get('/coverage', controller.checkCoverage);

module.exports = router;
