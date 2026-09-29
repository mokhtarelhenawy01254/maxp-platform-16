/**
 * 🌐 External HR Routes
 * مسارات الـ API المفتوحة للأنظمة الخارجية، أجهزة البصمة، وأدوات الذكاء الاصطناعي
 */

const express = require('express');
const router = express.Router();
const hrExternalController = require('../controller/hr/hrExternalController');
const {
  authenticateExternalHrApi,
  requireExternalHrScope
} = require('../middleware/externalHrApiAuth');

// 🔒 Apply External API Key authentication to all routes in this router
router.use(authenticateExternalHrApi);

// 👥 Employees Sync & Query (ERPs, AI Profile Checks)
router.get('/employees', requireExternalHrScope('hr:employees:read'), hrExternalController.listEmployees);
router.get('/employees/:id', requireExternalHrScope('hr:employees:read'), hrExternalController.getEmployeeById);
router.post('/employees/upsert', requireExternalHrScope('hr:employees:write'), hrExternalController.upsertEmployee);

// ⏰ Biometric Punches & Attendance Ingestion
router.post('/attendance/punches/batch', requireExternalHrScope('hr:attendance:ingest'), hrExternalController.recordPunchesBatch);
router.get('/attendance/today', requireExternalHrScope('hr:attendance:read'), hrExternalController.getTodayAttendance);

// 🏖️ Leaves & Absence
router.post('/leaves', requireExternalHrScope('hr:leaves:write'), hrExternalController.createLeaveRequest);

// 🔔 Outbound Webhooks Management
router.get('/webhooks', requireExternalHrScope('hr:write'), hrExternalController.listWebhookEndpoints);
router.post('/webhooks', requireExternalHrScope('hr:write'), hrExternalController.createWebhookEndpoint);

module.exports = router;
