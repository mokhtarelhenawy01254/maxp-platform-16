const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingAppointmentsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllAppointments);
router.get('/available-slots', verifyToken.authenticateToken, controller.getAvailableSlots);
router.post('/', verifyToken.authenticateToken, controller.createAppointment);
router.put('/:id/status', verifyToken.authenticateToken, controller.updateAppointmentStatus);
router.post('/:id/confirm', verifyToken.authenticateToken, controller.confirmAppointment);
router.put('/bulk-status', verifyToken.authenticateToken, controller.bulkUpdateStatus);
router.post('/bulk-delete', verifyToken.authenticateToken, controller.bulkDelete);

module.exports = router;
