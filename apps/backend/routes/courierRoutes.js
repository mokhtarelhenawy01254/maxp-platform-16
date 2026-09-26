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

// Dashboard telemetry summary
router.get(
  '/dashboard-summary',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.getSummary
);

// Couriers CRUD
router.get(
  '/',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.listCouriers
);

router.get(
  '/:id',
  verifyToken.requireRole(COURIER_ROLES),
  courierController.getCourier
);

router.post(
  '/',
  verifyToken.requireRole(MANAGE_ROLES),
  courierController.createCourier
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

module.exports = router;
