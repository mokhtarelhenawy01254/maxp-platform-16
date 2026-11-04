/**
 * Shipping Portal Routes (SHIP-W1A)
 * Standalone shipments, rate-card quote, and parcel tracking
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const shippingPortalController = require('../controller/shippingPortalController');

/**
 * Access guard allowing either internal-courier-fleet OR order-shipping-turbo
 */
const requireShippingAppAccess = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const runCheck = (slug) =>
    new Promise((resolve) => {
      const mw = checkAppAccess(slug);
      const mockRes = {
        status: () => mockRes,
        json: () => resolve(false),
        setHeader: () => {},
      };
      Promise.resolve(mw(req, mockRes, () => resolve(true))).catch(() => resolve(false));
    });

  const fleetOk = await runCheck('internal-courier-fleet');
  if (fleetOk) return next();

  const turboOk = await runCheck('order-shipping-turbo');
  if (turboOk) return next();

  return res.status(403).json({
    success: false,
    message: 'هذه الميزة تتطلب تفعيل تطبيق أسطول المناديب الداخلي (internal-courier-fleet) أو شحن الطلبات وتوربو (order-shipping-turbo)',
  });
};

const portalAuth = [verifyToken.authenticateToken, requireShippingAppAccess];

// Dynamic quote calculation
router.post('/quote', ...portalAuth, shippingPortalController.getShippingQuote);

// Standalone parcel creation
router.post('/shipments', ...portalAuth, shippingPortalController.createStandaloneShipment);

// Bulk parcel import (SHIP-W11 / SHP-07)
router.post(
  '/shipments/bulk',
  ...portalAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
      }
      next();
    });
  },
  shippingPortalController.bulkImportShipments
);

// Shipment list and details
router.get('/shipments', ...portalAuth, shippingPortalController.getShipments);
router.get('/shipments/:id', ...portalAuth, shippingPortalController.getShipmentById);

// Cancel shipment (only allowed when PENDING)
router.delete('/shipments/:id/cancel', ...portalAuth, shippingPortalController.cancelShipment);
router.post('/shipments/:id/cancel', ...portalAuth, shippingPortalController.cancelShipment);

// Client rate cards CRUD
router.get('/rate-cards', ...portalAuth, shippingPortalController.getRateCards);
router.post('/rate-cards', ...portalAuth, shippingPortalController.createRateCard);
router.put('/rate-cards/:id', ...portalAuth, shippingPortalController.updateRateCard);
router.delete('/rate-cards/:id', ...portalAuth, shippingPortalController.deleteRateCard);

// Dashboard telemetry & merchant helper
router.get('/stats', ...portalAuth, shippingPortalController.getDashboardStats);
router.get('/merchants', ...portalAuth, shippingPortalController.getMerchants);

// Pickups (SHIP-W2)
router.post('/pickups', ...portalAuth, shippingPortalController.createPickupRequest);
router.get('/pickups', ...portalAuth, shippingPortalController.getPickupRequests);
router.get('/pickups/:id', ...portalAuth, shippingPortalController.getPickupRequestById);
router.patch('/pickups/:id/schedule', ...portalAuth, shippingPortalController.schedulePickupRequest);
router.patch('/pickups/:id/assign', ...portalAuth, shippingPortalController.assignPickupCourier);
router.patch('/pickups/:id/complete', ...portalAuth, shippingPortalController.completePickupRequest);
router.patch('/pickups/:id/cancel', ...portalAuth, shippingPortalController.cancelPickupRequest);

// Branches (SHIP-W2 & SHIP-W10)
router.get('/branches/custody-diff', ...portalAuth, shippingPortalController.getCustodyDiff);
router.get('/custody-diff', ...portalAuth, shippingPortalController.getCustodyDiff);
router.get('/branches', ...portalAuth, shippingPortalController.getBranches);
router.post('/branches', ...portalAuth, shippingPortalController.createBranch);
router.get('/branches/:id/inventory', ...portalAuth, shippingPortalController.getBranchInventory);
router.get('/branches/:id/summary', ...portalAuth, shippingPortalController.getBranchSummary);
router.post('/branches/:id/transfer', ...portalAuth, shippingPortalController.transferBranchShipments);
router.put('/branches/:id', ...portalAuth, shippingPortalController.updateBranch);
router.delete('/branches/:id', ...portalAuth, shippingPortalController.deleteBranch);

// Label PDF & Hub Receive (SHIP-W2)
router.get('/shipments/:id/label', ...portalAuth, shippingPortalController.getShipmentLabelPdf);
router.post('/shipments/:id/receive', ...portalAuth, shippingPortalController.receiveShipmentAtHub);

// Failure Reasons Management (SHIP-W3)
router.get('/failure-reasons', ...portalAuth, shippingPortalController.getFailureReasons);
router.post('/failure-reasons', ...portalAuth, shippingPortalController.createFailureReason);
router.patch('/failure-reasons/:id', ...portalAuth, shippingPortalController.updateFailureReason);

// Status Update & Reattempt (SHIP-W3)
router.patch('/shipments/:id/status', ...portalAuth, shippingPortalController.updateShipmentStatus);
router.post('/shipments/:id/reattempt', ...portalAuth, shippingPortalController.reattemptShipment);

// Automated RTO Maintenance (SHIP-W3)
router.post('/maintenance/run-rto', ...portalAuth, shippingPortalController.runRtoMaintenance);

// Settlements & Statements (SHIP-W5)
router.use('/settlements', ...portalAuth, require('./shippingPortalSettlementRoutes'));

// Policy Settings (SHIP-W1A / SHIP-UAT-2)
router.get('/policy', ...portalAuth, async (req, res) => {
  try {
    const policyService = require('../services/shipping/policyService');
    const policy = await policyService.getPolicy(req.user.companyId);
    return res.json({ success: true, data: policy });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.put('/policy', ...portalAuth, async (req, res) => {
  try {
    const policyService = require('../services/shipping/policyService');
    const updated = await policyService.updatePolicy(req.user.companyId, req.body);
    return res.json({ success: true, data: updated, message: 'تم تحديث سياسة الشحن بنجاح' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

module.exports = router;

