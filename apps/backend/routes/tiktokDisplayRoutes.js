/**
 * tiktokDisplayRoutes.js
 * TikTok Embed + Display API routes.
 * Orchestrator mounts this router at /api/v1/tiktok/display.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const tiktokDisplayController = require('../controller/tiktokDisplayController');

router.get('/videos', verifyToken.authenticateToken, tiktokDisplayController.listVideos);
router.get('/embed/:videoId', verifyToken.authenticateToken, tiktokDisplayController.getEmbedInfo);
router.get('/settings', verifyToken.authenticateToken, tiktokDisplayController.getSettings);
router.put('/settings', verifyToken.authenticateToken, tiktokDisplayController.saveSettings);
router.get('/account', verifyToken.authenticateToken, tiktokDisplayController.getAccountInfo);

module.exports = router;
