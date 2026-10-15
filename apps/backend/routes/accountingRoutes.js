const express = require('express');
const router = express.Router();
const controller = require('../controller/accountingController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// All accounting routes require authentication and subscription access to 'accounting'
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('accounting'));

// 1. Chart of Accounts (COA)
router.get('/accounts/tree', controller.getAccountTree);
router.get('/accounts/:id', controller.getAccountById);
router.get('/accounts', controller.listAccounts);
router.post('/accounts', controller.createAccount);
router.put('/accounts/:id', controller.updateAccount);
router.delete('/accounts/:id', controller.deleteAccount);

// 2. Journal Entries
router.get('/entries/:id', controller.getEntryById);
router.get('/entries', controller.listEntries);
router.post('/entries', controller.createEntry);
router.put('/entries/:id', controller.updateEntry);
router.post('/entries/:id/post', controller.postEntry);
router.post('/entries/:id/void', controller.voidEntry);

// 3. Fiscal Periods
router.get('/periods', controller.listPeriods);
router.post('/periods/open', controller.openPeriod);
router.post('/periods/close', controller.closePeriod);

// 4. Accounting Settings
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

// 5. Seed & Opening Balance
router.post('/seed', controller.seedEgyptianCOA);
router.post('/opening-balance', controller.createOpeningBalance);

// 6. Financial Reports
router.get('/reports/trial-balance', controller.getTrialBalance);
router.get('/reports/ledger', controller.getGeneralLedger);
router.get('/reports/statement', controller.getStatement);
router.get('/reports/profit-loss', controller.getProfitAndLoss);
router.get('/reports/balance-sheet', controller.getBalanceSheet);
router.get('/reports/vat', controller.getVatReport);

// 7. Auto-Posting Unposted Queue
router.get('/unposted', controller.listUnpostedQueue);
router.post('/unposted/:id/retry', controller.retryUnpostedEntry);
router.post('/unposted/retry-all', controller.retryAllUnposted);

module.exports = router;
