const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingDoctorAvailabilityController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAvailability);
router.put('/:doctorId', verifyToken.authenticateToken, controller.updateAvailability);

module.exports = router;
