const express = require('express');
const router = express.Router();
const controller = require('../controller/educationSettingsController');
const verifyToken = require('../utils/verifyToken');
const requireEducationAppInstalled = require('../middleware/requireEducationAppInstalled');

router.get('/', verifyToken.authenticateToken, requireEducationAppInstalled, controller.getSettings);
router.put('/', verifyToken.authenticateToken, requireEducationAppInstalled, controller.requireSettingsManage, controller.updateSettings);

module.exports = router;
