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
const {
  externalApiRateLimiter,
  docRateLimiter
} = require('../middleware/externalHrRateLimiter');

const openApiSpec = require('../config/openapi-hr.json');

// 📖 Public OpenAPI Spec & Interactive Documentation (No Auth Required, IP Rate-limited)
router.get('/openapi.json', docRateLimiter, (req, res) => {
  res.json(openApiSpec);
});

router.get('/docs', docRateLimiter, (req, res) => {
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <title>MaxP HR API Documentation & Interactive Explorer</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://maxp.online/favicon.svg" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; padding: 0; background: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
      .swagger-ui .information-container { max-width: 900px; margin: 0 auto; }
      .swagger-ui .wrapper { max-width: 1100px; margin: 0 auto; padding: 20px; }
      .custom-header { background: #18181b; border-bottom: 1px solid #27272a; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
      .custom-header h1 { margin: 0; font-size: 18px; color: #fff; font-weight: 700; }
      .custom-header a { color: #3b82f6; text-decoration: none; font-size: 13px; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="custom-header">
      <h1>MaxP Platform — External HR & AI API Gateway</h1>
      <a href="/api/v1/external/hr/openapi.json" target="_blank">Download OpenAPI Spec (JSON) &rarr;</a>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/v1/external/hr/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout"
        });
      };
    </script>
  </body>
</html>`);
});

// 🔒 Apply External API Key authentication and per-key token bucket rate limiting to all remaining routes
router.use(authenticateExternalHrApi);
router.use(externalApiRateLimiter);

// 👥 Employees Sync & Query (ERPs, AI Profile Checks)
router.get('/employees', requireExternalHrScope('hr:employees:read'), hrExternalController.listEmployees);
router.get('/employees/stats', requireExternalHrScope('hr:employees:read'), hrExternalController.getEmployeeStats);
router.get('/employees/organization-chart', requireExternalHrScope('hr:employees:read'), hrExternalController.getOrganizationChart);
router.get('/employees/:id', requireExternalHrScope('hr:employees:read'), hrExternalController.getEmployeeById);
router.post('/employees/upsert', requireExternalHrScope('hr:employees:write'), hrExternalController.upsertEmployee);

// 🏢 Departments & Positions Taxonomy
router.get('/departments', requireExternalHrScope('hr:departments:read'), hrExternalController.listDepartments);
router.get('/positions', requireExternalHrScope('hr:positions:read'), hrExternalController.listPositions);

// ⏰ Biometric Punches & Attendance Ingestion
router.post('/attendance/punches/batch', requireExternalHrScope('hr:attendance:ingest'), hrExternalController.recordPunchesBatch);
router.get('/attendance/today', requireExternalHrScope('hr:attendance:read'), hrExternalController.getTodayAttendance);
router.get('/attendance/summary', requireExternalHrScope('hr:attendance:read'), hrExternalController.getAttendanceSummary);

// 🏖️ Leaves & Absence
router.get('/leaves', requireExternalHrScope('hr:leaves:read'), hrExternalController.listLeaveRequests);
router.get('/leaves/balances', requireExternalHrScope('hr:leaves:read'), hrExternalController.getLeaveBalances);
router.post('/leaves', requireExternalHrScope('hr:leaves:write'), hrExternalController.createLeaveRequest);
router.post('/leaves/:id/decision', requireExternalHrScope('hr:leaves:approve'), hrExternalController.decideLeaveRequest);

// 💰 Payroll Runs & Slips
router.get('/payroll/runs', requireExternalHrScope('hr:payroll:read'), hrExternalController.listPayrollRuns);
router.get('/payroll/runs/:id/items', requireExternalHrScope('hr:payroll:read'), hrExternalController.getPayrollRunItems);

// 🔔 Outbound Webhooks Management
router.get('/webhooks', requireExternalHrScope('hr:write'), hrExternalController.listWebhookEndpoints);
router.post('/webhooks', requireExternalHrScope('hr:write'), hrExternalController.createWebhookEndpoint);

module.exports = router;
