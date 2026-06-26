const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingDoctorsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllDoctors);
router.post('/', verifyToken.authenticateToken, controller.createDoctor);
router.put('/:id', verifyToken.authenticateToken, controller.updateDoctor);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteDoctor);

module.exports = router;
