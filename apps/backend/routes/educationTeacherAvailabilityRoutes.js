const express = require('express');
const router = express.Router();
const controller = require('../controller/educationTeacherAvailabilityController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.put('/', verifyToken.authenticateToken, controller.save);

module.exports = router;
