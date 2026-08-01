const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingReportsController');
const verifyToken = require('../utils/verifyToken');

router.get('/summary', verifyToken.authenticateToken, controller.getReportsSummary);
router.get('/export', verifyToken.authenticateToken, controller.exportCsv);

module.exports = router;