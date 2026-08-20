const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingWorkflowController');
const verifyToken = require('../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.put('/appointments/:id/booking-status', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.updateBookingStatus);
router.put('/appointments/:id/report-status', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.updateReportStatus);
router.put('/appointments/:id/assign-doctor', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.assignDoctor);
router.put('/appointments/:id/delivered-without-report', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.markDeliveredWithoutReport);
router.put('/appointments/:id/result-delivered', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.markResultDelivered);
router.get('/queues/reception', verifyToken.authenticateToken, controller.receptionQueue);
router.get('/queues/doctor', verifyToken.authenticateToken, controller.doctorWorklist);
router.get('/queues/reports', verifyToken.authenticateToken, controller.reportWorklist);

module.exports = router;
