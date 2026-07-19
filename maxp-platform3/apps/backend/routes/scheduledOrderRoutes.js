const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const scheduledOrderSettingsController = require('../controller/scheduledOrderSettingsController');

router.get('/settings', verifyToken.authenticateToken, scheduledOrderSettingsController.getSettings);
router.put('/settings', verifyToken.authenticateToken, scheduledOrderSettingsController.updateSettings);
router.get('/stats', verifyToken.authenticateToken, scheduledOrderSettingsController.getStats);
router.get('/upcoming', verifyToken.authenticateToken, scheduledOrderSettingsController.getUpcomingOrders);
router.post('/transition', verifyToken.authenticateToken, scheduledOrderSettingsController.manualTransition);

module.exports = router;
