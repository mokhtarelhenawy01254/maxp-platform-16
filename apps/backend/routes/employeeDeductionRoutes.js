/**
 * 💰 Employee Deduction Routes
 * مسارات الخصومات للموظفين
 */
 
const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const deductionController = require('../controller/deductionController');

// Employee Routes - عرض الخصومات الخاصة بالموظف
router.get('/my-deductions', verifyToken.authenticateToken, deductionController.getMyDeductions);
router.get('/my-deductions/stats', verifyToken.authenticateToken, deductionController.getMyDeductionStats);

module.exports = router;
