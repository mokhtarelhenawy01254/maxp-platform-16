const express = require('express');
const router = express.Router();
const controller = require('../controller/educationSettingsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getSettings);
router.put('/', verifyToken.authenticateToken, controller.updateSettings);

module.exports = router;
