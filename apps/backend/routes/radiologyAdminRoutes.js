const express = require('express');
const router = express.Router();
const appointments = require('../controller/radiologyAppointmentsController');
const physicians = require('../controller/radiologyReferringPhysiciansController');
const additions = require('../controller/radiologyExamAdditionsController');
const statistics = require('../controller/radiologyStatisticsController');
const payments = require('../controller/radiologyPaymentsController');
const shifts = require('../controller/radiologyShiftsController');
const devices = require('../controller/radiologyDevicesController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

// Cashier shifts
router.get('/shifts', shifts.listShifts);
router.get('/shifts/active', shifts.getActiveShift);
router.post('/shifts', verifyToken.requireRole(MANAGER_ROLES), shifts.openShift);
router.post('/shifts/:id/close', verifyToken.requireRole(MANAGER_ROLES), shifts.closeShift);

// Study payments
router.get('/studies/:id/payment', payments.getStudyPayment);
router.post('/studies/:id/payment', verifyToken.requireRole(MANAGER_ROLES), payments.recordStudyPayment);
router.post('/studies/:id/payment/refund', verifyToken.requireRole(MANAGER_ROLES), payments.refundStudyPayment);

// Financial summary
router.get('/financial-summary', payments.financialSummary);

// Appointments
router.get('/appointments', appointments.listAppointments);
router.post('/appointments', verifyToken.requireRole(MANAGER_ROLES), appointments.createAppointment);
router.put('/appointments/:id', verifyToken.requireRole(MANAGER_ROLES), appointments.updateAppointment);
router.delete('/appointments/:id', verifyToken.requireRole(MANAGER_ROLES), appointments.deleteAppointment);
router.post('/appointments/:id/convert', verifyToken.requireRole(MANAGER_ROLES), appointments.convertToStudy);

// Devices (imaging machines/rooms)
router.get('/devices', devices.listDevices);
router.post('/devices', verifyToken.requireRole(MANAGER_ROLES), devices.createDevice);
router.put('/devices/:id', verifyToken.requireRole(MANAGER_ROLES), devices.updateDevice);
router.delete('/devices/:id', verifyToken.requireRole(MANAGER_ROLES), devices.deleteDevice);

// Referring physicians
router.get('/referring-physicians', physicians.listPhysicians);
router.post('/referring-physicians', verifyToken.requireRole(MANAGER_ROLES), physicians.createPhysician);
router.put('/referring-physicians/:id', verifyToken.requireRole(MANAGER_ROLES), physicians.updatePhysician);
router.delete('/referring-physicians/:id', verifyToken.requireRole(MANAGER_ROLES), physicians.deletePhysician);
router.get('/referring-physicians/commissions', physicians.physicianCommissions);

// Exam additions
router.get('/exam-additions', additions.listAdditions);
router.post('/exam-additions', verifyToken.requireRole(MANAGER_ROLES), additions.createAddition);
router.put('/exam-additions/:id', verifyToken.requireRole(MANAGER_ROLES), additions.updateAddition);
router.delete('/exam-additions/:id', verifyToken.requireRole(MANAGER_ROLES), additions.deleteAddition);

// Statistics
router.get('/statistics', statistics.getStatistics);

module.exports = router;
