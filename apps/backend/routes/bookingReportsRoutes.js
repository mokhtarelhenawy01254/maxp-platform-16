const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingReportsController');
const verifyToken = require('../utils/verifyToken');

router.get('/summary', verifyToken.authenticateToken, controller.getReportsSummary);
router.get('/export', verifyToken.authenticateToken, controller.exportCsv);
router.get('/revenue', verifyToken.authenticateToken, controller.getRevenueReport);
router.get('/actual-vs-expected', verifyToken.authenticateToken, controller.getActualVsExpected);
router.get('/physician-commissions', verifyToken.authenticateToken, controller.getPhysicianCommissions);
router.get('/dues', verifyToken.authenticateToken, controller.getDues);
router.get('/refunds', verifyToken.authenticateToken, controller.getRefunds);
router.get('/cashier-daily', verifyToken.authenticateToken, controller.getCashierDaily);

module.exports = router;
