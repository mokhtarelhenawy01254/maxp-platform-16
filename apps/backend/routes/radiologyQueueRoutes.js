const express = require('express');
const router = express.Router();
const queueController = require('../controller/radiologyQueueController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

// Daily queue — read-only, mirrors the GET pattern of radiologyRoutes (authenticated, no role gate)
router.get('/daily', queueController.getDailyQueue);

module.exports = router;
