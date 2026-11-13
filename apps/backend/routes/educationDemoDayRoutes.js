const express = require('express');
const router = express.Router();
const controller = require('../controller/educationDemoDayController');
const verifyToken = require('../utils/verifyToken');

// Public routes (External landing registration)
router.get('/public/:id', controller.getPublicDemoDay);
router.post('/public/:id/register', controller.registerPublicAttendee);

// Authenticated Admin routes
router.use(verifyToken.authenticateToken);

// Attribution Analytics (MUST be before /:id)
router.get('/analytics/attribution', controller.getAttributionAnalytics);

// Events CRUD
router.get('/', controller.getAllDemoDays);
router.post('/', controller.createDemoDay);
router.get('/:id', controller.getDemoDayById);
router.put('/:id', controller.updateDemoDay);
router.delete('/:id', controller.deleteDemoDay);

// Broadcast WhatsApp Reminder
router.post('/:id/broadcast-reminder', controller.broadcastReminder);

// Attendees & Lead Conversion
router.post('/:id/attendees', controller.registerAttendee);
router.put('/attendees/:attendeeId/status', controller.updateAttendeeStatus);
router.post('/attendees/:attendeeId/convert', controller.convertAttendeeToStudent);
router.delete('/attendees/:attendeeId', controller.deleteAttendee);

module.exports = router;
