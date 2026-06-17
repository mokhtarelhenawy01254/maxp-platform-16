/**
 * 🕐 Lateness Routes
 * مسارات إدارة المرونة والخصومات التلقائية
 */

const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const latenessController = require('../controller/latenessController');

// Employee routes - الموظف يشوف رصيده الخاص
router.get('/balance', verifyToken.authenticateToken, latenessController.getMyBalance);
router.get('/auto-deductions', verifyToken.authenticateToken, latenessController.getAutoDeductions);
router.get('/report', verifyToken.authenticateToken, latenessController.getMonthlyReport);

// HR/Admin routes - الإدارة تدير إعدادات الموظفين
router.get('/balance/:employeeId', verifyToken.authenticateToken, latenessController.getEmployeeBalance);
router.get('/settings/:employeeId', verifyToken.authenticateToken, latenessController.getEmployeeSettings);
router.put('/settings/:employeeId', verifyToken.authenticateToken, latenessController.updateEmployeeSettings);
router.get('/stats', verifyToken.authenticateToken, latenessController.getCompanyStats);
router.post('/cancel-deduction/:deductionId', verifyToken.authenticateToken, latenessController.cancelAutoDeduction);

module.exports = router;
