const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const courierController = require('../controller/courierController');

const MANAGE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'OPERATIONS', 'WAREHOUSE'];
const COURIER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'OPERATIONS', 'WAREHOUSE', 'COURIER', 'EMPLOYEE'];

// Dashboard telemetry summary
router.get(
  '/dashboard-summary',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.getSummary
);

// Couriers CRUD
router.get(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireRole(COURIER_ROLES),
  courierController.listCouriers
);

router.get(
  '/:id',
  verifyToken.authenticateToken,
  verifyToken.requireRole(COURIER_ROLES),
  courierController.getCourier
);

router.post(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.createCourier
);

router.put(
  '/:id',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.updateCourier
);

router.delete(
  '/:id',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.deleteCourier
);

// Delivery Runs (Manifests)
router.post(
  '/runs',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.createRun
);

router.get(
  '/runs',
  verifyToken.authenticateToken,
  verifyToken.requireRole(COURIER_ROLES),
  courierController.listRuns
);

router.get(
  '/runs/:id',
  verifyToken.authenticateToken,
  verifyToken.requireRole(COURIER_ROLES),
  courierController.getRun
);

// Field updates (Courier updates delivery attempt: delivered, delayed, returned)
router.patch(
  '/runs/:runId/shipments/:shipmentId',
  verifyToken.authenticateToken,
  verifyToken.requireRole(COURIER_ROLES),
  courierController.updateShipmentStatus
);

// End-of-Day Financial Remittance to Treasury
router.post(
  '/runs/:id/settle',
  verifyToken.authenticateToken,
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.settleRun
);

module.exports = router;
