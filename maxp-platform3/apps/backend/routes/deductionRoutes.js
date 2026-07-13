/**
 * 💰 Deduction Routes
 * مسارات الخصومات اليدوية
 */

const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const deductionController = require('../controller/deductionController');

const { handleHRError } = require('../utils/hrErrors');

console.log('🔧 [DEDUCTION-ROUTES] Loading deduction routes...');
console.log('🔧 [DEDUCTION-ROUTES] Controller functions:', Object.keys(deductionController));

// HR Routes - إدارة الخصومات
router.post('/', verifyToken.authenticateToken, deductionController.createDeduction);
router.get('/', verifyToken.authenticateToken, deductionController.getDeductions);
router.get('/stats', verifyToken.authenticateToken, deductionController.getDeductionStats);
router.get('/:id', verifyToken.authenticateToken, deductionController.getDeductionById);
router.put('/:id', verifyToken.authenticateToken, deductionController.updateDeduction);
router.post('/:id/approve', verifyToken.authenticateToken, deductionController.approveDeduction);
router.post('/:id/reject', verifyToken.authenticateToken, deductionController.rejectDeduction);
router.delete('/:id', verifyToken.authenticateToken, deductionController.deleteDeduction);

// Error Handler
router.use(handleHRError);

module.exports = router;
