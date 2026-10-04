const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const courierController = require('../controller/courierController');

const MANAGE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'OPERATIONS', 'WAREHOUSE'];
const COURIER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'OPERATIONS', 'WAREHOUSE', 'COURIER', 'EMPLOYEE'];

// 🛡️ All courier fleet operations strictly require authenticated token and active app installation
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('internal-courier-fleet'));

// ⚠️ Ordering contract for this router: ALL static paths (dashboard-summary, commissions,
// performance, runs…) MUST be declared before the parameterized /:id routes.
// GET /:id used to shadow GET /runs — the run list was captured as getCourier("runs")
// and 404ed with "المندوب غير موجود". A regression test in courierFleetIsolation.test.js
// pins this contract; do not reorder without running it.

// Dashboard telemetry summary
router.get(
  '/dashboard-summary',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.getSummary
);

// Commission ledger: per-courier DUE/PAID totals + entries
router.get(
  '/commissions',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.listCommissions
);

// Pay out a courier's DUE commissions
router.post(
  '/commissions/:courierId/pay',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.payCommissions
);

// Time-ranged courier performance report
router.get(
  '/performance',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.getPerformance
);

// Reassign internal-courier shipments to another courier
router.post(
  '/shipments/reassign',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.reassignShipments
);

// Regenerate + resend a parcel's delivery OTP (managers) — escape hatch when the
// customer's WhatsApp message failed and the courier is locked out of delivering
router.post(
  '/shipments/:shipmentId/resend-otp',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.resendOtp
);

// Delivery Runs (Manifests)
router.post(
  '/runs',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.createRun
);

router.get(
  '/runs',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.listRuns
);

router.get(
  '/runs/:id',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.getRun
);

router.get(
  '/runs/:id/share-link',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.getRunShareLink
);

// Field updates (Courier updates delivery attempt: delivered, delayed, returned)
router.patch(
  '/runs/:runId/shipments/:shipmentId',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.updateShipmentStatus
);

// End-of-Day Financial Remittance to Treasury
router.post(
  '/runs/:id/settle',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.settleRun
);

// Couriers CRUD — root first, then the two-segment /:id/pin, and the one-segment
// /:id routes LAST so they can never shadow any static path above.
router.get(
  '/',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.listCouriers
);

router.post(
  '/',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.createCourier
);

router.put(
  '/:id/pin',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.setCourierPin
);

router.get(
  '/:id',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.getCourier
);

router.put(
  '/:id',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.updateCourier
);

router.delete(
  '/:id',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.deleteCourier
);

module.exports = router;
