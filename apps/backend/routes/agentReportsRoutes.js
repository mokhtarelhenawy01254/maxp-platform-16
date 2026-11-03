const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { authenticateToken } = verifyToken;
const checkAppAccess = require('../middleware/checkAppAccess');
const agentReportsController = require('../controller/agentReportsController');

// 📦 Scope large JSON body parser (15MB) specifically to agent reports router (AR-1)
router.use(express.json({ limit: '15mb' }));

// 🔐 Authentication and app access guards
router.use(authenticateToken);
router.use(checkAppAccess('agent-reports'));

// 🏷️ Report Types
router.get('/types', agentReportsController.getTypes);
router.post('/types', agentReportsController.createType);
router.patch('/types/:id', agentReportsController.updateType);
router.delete('/types/:id', agentReportsController.deleteType);

// 📄 Reports
router.get('/reports', agentReportsController.getReports);
router.post('/reports', agentReportsController.createReport);
router.get('/reports/:id', agentReportsController.getReportById);
router.get('/reports/:id/html', agentReportsController.getReportHtml);
router.patch('/reports/:id', agentReportsController.updateReport);
router.delete('/reports/:id', agentReportsController.deleteReport);

module.exports = router;
