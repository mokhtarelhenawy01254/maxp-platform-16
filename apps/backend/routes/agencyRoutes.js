const express = require('express');
const router = express.Router();
const agencyController = require('../controller/agencyController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Public portal routes for clients to review and approve (no authentication needed)
router.get('/public/approval/:token', agencyController.getPublicApproval);
router.post('/public/approval/:token', agencyController.respondPublicApproval);
router.get('/public-approval/:token', agencyController.getPublicApproval);
router.post('/public-approval/:token', agencyController.respondPublicApproval);

// Authenticated Agency Hub routes
const agencyAuth = [verifyToken.authenticateToken, checkAppAccess('marketing-agency-pro')];

router.get('/overview', agencyAuth, agencyController.getAgencyOverview);

// Client portfolio management
router.get('/clients', agencyAuth, agencyController.getClients);
router.post('/clients', agencyAuth, agencyController.createClient);
router.put('/clients/:clientId', agencyAuth, agencyController.updateClient);
router.delete('/clients/:clientId', agencyAuth, agencyController.deleteClient);

// Performance & manual entry (Daily & Monthly for on-platform and off-platform clients)
router.post('/clients/:clientId/performance', agencyAuth, agencyController.logClientPerformance);
router.delete('/clients/:clientId/daily-logs/:date', agencyAuth, agencyController.deleteDailyLog);

// Extra billable services / add-on line items (logo design, video, photoshoot, expenses)
router.post('/clients/:clientId/extra-services', agencyAuth, agencyController.addExtraService);
router.delete('/clients/:clientId/extra-services/:serviceId', agencyAuth, agencyController.deleteExtraService);

// Billing statements & invoices
router.get('/invoices', agencyAuth, agencyController.getInvoices);
router.patch('/clients/:clientId/invoices/:month/status', agencyAuth, agencyController.toggleInvoiceStatus);

// Creative approval pipeline
router.get('/approvals', agencyAuth, agencyController.getApprovals);
router.post('/approvals', agencyAuth, agencyController.createApproval);
router.put('/approvals/:approvalId', agencyAuth, agencyController.updateApproval);
router.delete('/approvals/:approvalId', agencyAuth, agencyController.deleteApproval);

module.exports = router;
