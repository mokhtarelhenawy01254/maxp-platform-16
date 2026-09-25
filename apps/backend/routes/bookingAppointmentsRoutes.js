const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingAppointmentsController');
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('booking-app'));

router.get('/', controller.getAllAppointments);
router.get('/available-slots', controller.getAvailableSlots);
router.get('/timeline', controller.getTimeline);
router.post('/', controller.createAppointment);
router.put('/bulk-status', controller.bulkUpdateStatus);
router.post('/bulk-delete', controller.bulkDelete);
router.put('/:id', controller.updateAppointment);
router.put('/:id/status', controller.updateAppointmentStatus);
router.post('/:id/confirm', controller.confirmAppointment);

module.exports = router;
