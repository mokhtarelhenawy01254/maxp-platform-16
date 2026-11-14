const express = require('express');
const router = express.Router();
const controller = require('../controller/educationTeacherAvailabilityController');
const verifyToken = require('../utils/verifyToken');
const requireEducationAppInstalled = require('../middleware/requireEducationAppInstalled');

router.use(verifyToken.authenticateToken, requireEducationAppInstalled);

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.put('/', verifyToken.authenticateToken, controller.save);

module.exports = router;
