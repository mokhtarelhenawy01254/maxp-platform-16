const express = require('express');
const router = express.Router();
const controller = require('../controller/treasuryExpensesController');
const verifyToken = require('../utils/verifyToken');

const { checkAppAccess } = require('../middleware/checkAppAccess');

// All treasury & expenses routes require authentication and subscription access
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('treasury-expenses'));

// 1. Treasury Accounts & Vaults
router.get('/accounts', controller.getAccounts);
router.post('/accounts', controller.createAccount);
router.put('/accounts/:id', controller.updateAccount);
router.post('/transfer', controller.transferBetweenAccounts);

// 2. Capital & Injections
router.get('/capital/stats', controller.getCapitalStats);
router.post('/capital/deposit', controller.depositCapital);

// 3. Categories
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);

// 4. Expenses (Outflows)
router.get('/expenses', controller.getExpenses);
router.get('/expenses/stats', controller.getExpenseStats);
router.post('/expenses', controller.createExpense);
router.put('/expenses/:id', controller.updateExpense);
router.delete('/expenses/:id', controller.deleteExpense);

// 5. Ledger (Running balance history)
router.get('/ledger', controller.getLedger);

module.exports = router;
