const express = require('express');
const router = express.Router();
const controller = require('../controller/accountingController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { requirePermission } = require('../middleware/rbacMiddleware');

// All accounting routes require authentication, subscription access to 'accounting', and basic accounting.view
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('accounting'));
router.use(requirePermission('accounting.view'));

// 1. Chart of Accounts (COA)
router.get('/accounts/tree', controller.getAccountTree);
router.get('/accounts/:id', controller.getAccountById);
router.get('/accounts', controller.listAccounts);
router.get('/coa', controller.listAccounts);
router.post('/accounts', requirePermission('accounting.coa.manage'), controller.createAccount);
router.put('/accounts/:id', requirePermission('accounting.coa.manage'), controller.updateAccount);
router.delete('/accounts/:id', requirePermission('accounting.coa.manage'), controller.deleteAccount);

// 2. Journal Entries
router.get('/entries/:id', controller.getEntryById);
router.get('/entries', controller.listEntries);
router.post('/entries', requirePermission('accounting.entries.create'), controller.createEntry);
router.put('/entries/:id', requirePermission('accounting.entries.create'), controller.updateEntry);
router.post('/entries/:id/post', requirePermission('accounting.entries.post'), controller.postEntry);
router.post('/entries/:id/void', requirePermission('accounting.entries.post'), controller.voidEntry);

// 3. Fiscal Periods
router.get('/periods', controller.listPeriods);
router.post('/periods/open', requirePermission('accounting.periods.manage'), controller.openPeriod);
router.post('/periods/close', requirePermission('accounting.periods.manage'), controller.closePeriod);

// 4. Accounting Settings
router.get('/settings', controller.getSettings);
router.put('/settings', requirePermission('accounting.coa.manage'), controller.updateSettings);

// 5. Seed & Opening Balance
router.post('/seed', requirePermission('accounting.coa.manage'), controller.seedEgyptianCOA);
router.post('/opening-balance', requirePermission('accounting.coa.manage'), controller.createOpeningBalance);

// 6. Financial Reports
router.get('/reports/trial-balance', requirePermission('accounting.reports.view'), controller.getTrialBalance);
router.get('/reports/ledger', requirePermission('accounting.reports.view'), controller.getGeneralLedger);
router.get('/reports/statement', requirePermission('accounting.reports.view'), controller.getStatement);
router.get('/reports/profit-loss', requirePermission('accounting.reports.view'), controller.getProfitAndLoss);
router.get('/reports/balance-sheet', requirePermission('accounting.reports.view'), controller.getBalanceSheet);
router.get('/reports/vat', requirePermission('accounting.reports.view'), controller.getVatReport);

// 7. Auto-Posting Unposted Queue
router.get('/unposted', controller.listUnpostedQueue);
router.post('/unposted/:id/retry', requirePermission('accounting.entries.post'), controller.retryUnpostedEntry);
router.post('/unposted/retry-all', requirePermission('accounting.entries.post'), controller.retryAllUnposted);

module.exports = router;
