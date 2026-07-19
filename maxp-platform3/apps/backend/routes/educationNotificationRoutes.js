const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const controller = require('../controller/educationNotificationController');

router.use(verifyToken.authenticateToken);

router.get('/funnel', controller.getFunnel);
router.get('/logs', controller.getLogs);
router.post('/test', controller.sendTest);

module.exports = router;
