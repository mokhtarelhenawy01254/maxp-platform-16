const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingWorkflowController');
const verifyToken = require('../utils/verifyToken');

router.put('/appointments/:id/booking-status', verifyToken.authenticateToken, controller.updateBookingStatus);
router.put('/appointments/:id/report-status', verifyToken.authenticateToken, controller.updateReportStatus);
router.put('/appointments/:id/assign-doctor', verifyToken.authenticateToken, controller.assignDoctor);
router.put('/appointments/:id/delivered-without-report', verifyToken.authenticateToken, controller.markDeliveredWithoutReport);
router.put('/appointments/:id/result-delivered', verifyToken.authenticateToken, controller.markResultDelivered);
router.get('/queues/reception', verifyToken.authenticateToken, controller.receptionQueue);
router.get('/queues/doctor', verifyToken.authenticateToken, controller.doctorWorklist);
router.get('/queues/reports', verifyToken.authenticateToken, controller.reportWorklist);

module.exports = router;
