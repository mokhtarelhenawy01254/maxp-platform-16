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

const openApiSpec = require('../config/openapi-hr.json');

// 📖 Public OpenAPI Spec & Interactive Documentation (No Auth Required)
router.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

router.get('/docs', (req, res) => {
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

// 🔒 Apply External API Key authentication to all remaining routes in this router
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
