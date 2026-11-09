const express = require('express');
const router = express.Router();
const controller = require('../controller/educationLogsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getLogs);
router.get('/stats', verifyToken.authenticateToken, controller.getStats);
router.get('/export', verifyToken.authenticateToken, controller.exportLogs);

module.exports = router;
