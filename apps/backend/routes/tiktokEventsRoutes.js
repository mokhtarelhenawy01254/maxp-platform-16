/**
 * tiktokEventsRoutes.js
 *
 * Routes لإدارة وإرسال TikTok Events (Pixel) — يتم تثبيتها تحت /api/v1/tiktok/events.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const tiktokEventsController = require('../controller/tiktokEventsController');

router.use(verifyToken.authenticateToken);

router.get('/configs', tiktokEventsController.listConfigs);
router.post('/configs', tiktokEventsController.createConfig);
router.patch('/configs/:id', tiktokEventsController.updateConfig);
router.delete('/configs/:id', tiktokEventsController.deleteConfig);
router.post('/configs/:id/test', tiktokEventsController.testConfig);
router.post('/track', tiktokEventsController.trackEvent);

module.exports = router;
