const express = require('express');
const router = express.Router();
const controller = require('../controller/treasuryExpensesController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { requirePermission } = require('../middleware/rbacMiddleware');

// All treasury & expenses routes require authentication, subscription access, and treasury.view permission
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('treasury-expenses-pro'));
router.use(requirePermission('treasury.view'));

// 1. Treasury Accounts & Vaults
router.get('/accounts', controller.getAccounts);
router.post('/accounts', requirePermission('treasury.capital.manage'), controller.createAccount);
router.put('/accounts/:id', requirePermission('treasury.capital.manage'), controller.updateAccount);
router.post('/transfer', requirePermission('treasury.capital.manage'), controller.transferBetweenAccounts);

// 2. Capital & Injections
router.get('/capital/stats', controller.getCapitalStats);
router.post('/capital/deposit', requirePermission('treasury.capital.manage'), controller.depositCapital);
router.post('/capital/:id/reverse', requirePermission('treasury.capital.manage'), controller.reverseCapitalDeposit);
router.delete('/capital/:id', requirePermission('treasury.capital.manage'), controller.reverseCapitalDeposit);

// 3. Categories
router.get('/categories', controller.getCategories);
router.post('/categories', requirePermission('treasury.expenses.create'), controller.createCategory);

// 4. Expenses (Outflows)
router.get('/expenses', controller.getExpenses);
router.get('/expenses/stats', controller.getExpenseStats);
router.post('/expenses', requirePermission('treasury.expenses.create'), controller.createExpense);
router.put('/expenses/:id', requirePermission('treasury.expenses.approve'), controller.updateExpense);
router.delete('/expenses/:id', requirePermission('treasury.expenses.approve'), controller.deleteExpense);

// 5. Ledger (Running balance history)
router.get('/ledger', controller.getLedger);

module.exports = router;
