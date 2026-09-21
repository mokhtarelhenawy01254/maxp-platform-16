const express = require('express');
const router = express.Router();
const monitorIngestController = require('../controller/monitor/monitorIngestController');
const monitorDashboardController = require('../controller/monitor/monitorDashboardController');
const { authenticateToken } = require('../utils/verifyToken');

router.use(authenticateToken);

// Ingest Endpoints
router.post('/heartbeat', monitorIngestController.heartbeat);
router.post('/session/end', monitorIngestController.endSession);
router.post('/activity/batch', monitorIngestController.processActivityBatch);
router.post('/apps/batch', monitorIngestController.processAppUsageBatch);
router.post('/web/batch', monitorIngestController.processWebUsageBatch);

// Dashboard Endpoints
router.get('/summary/:employeeId', monitorDashboardController.getSummary);
router.get('/timeline/:employeeId', monitorDashboardController.getTimeline);
router.get('/team/overview', monitorDashboardController.getTeamOverview);
router.get('/categories', monitorDashboardController.getCategories);
router.put('/categories', monitorDashboardController.updateCategory);
router.get('/alerts', monitorDashboardController.getAlerts);
router.put('/alerts/:id/read', monitorDashboardController.markAlertRead);
router.get('/ai-standup', monitorDashboardController.getAiDailyStandup);
router.post('/admin/retention-archive', monitorDashboardController.triggerDataArchival);

module.exports = router;
