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
const shippingPackageController = require('../controller/shippingPackageController');
const shippingExtraServicesController = require('../controller/shippingExtraServicesController');

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
router.get('/shipments/stale', ...portalAuth, shippingPortalController.getStaleShipments);
router.get('/shipments/:id', ...portalAuth, shippingPortalController.getShipmentById);

// Cancel shipment (only allowed when PENDING)
router.delete('/shipments/:id/cancel', ...portalAuth, shippingPortalController.cancelShipment);
router.post('/shipments/:id/cancel', ...portalAuth, shippingPortalController.cancelShipment);

// Client monthly packages CRUD & quote (SHIP-W14)
router.get('/packages/quote', ...portalAuth, shippingPackageController.getPackageQuote);
router.get('/packages', ...portalAuth, shippingPackageController.listPackages);
router.post('/packages', ...portalAuth, shippingPackageController.createPackage);
router.get('/packages/:id', ...portalAuth, shippingPackageController.getPackageById);
router.put('/packages/:id', ...portalAuth, shippingPackageController.updatePackage);
router.delete('/packages/:id', ...portalAuth, shippingPackageController.deletePackage);

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

// Label PDF & Hub Receive (SHIP-W2 & SHIP-W17)
router.get('/shipments/:id/print', ...portalAuth, shippingPortalController.printShipmentPdf);
router.get('/shipments/:id/label', ...portalAuth, shippingPortalController.printShipmentPdf);
router.post('/print/batch', ...portalAuth, shippingPortalController.printBatchShipmentsPdf);
router.post('/shipments/print/batch', ...portalAuth, shippingPortalController.printBatchShipmentsPdf);
router.post('/shipments/:id/receive', ...portalAuth, shippingPortalController.receiveShipmentAtHub);

// Full Orders Excel Import (SHIP-W17)
router.get('/orders/import-template', ...portalAuth, shippingPortalController.downloadOrdersImportTemplate);
router.post(
  '/orders/import',
  ...portalAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
      }
      next();
    });
  },
  shippingPortalController.importOrdersFromExcel
);

// Failure Reasons Management (SHIP-W3)
router.get('/failure-reasons', ...portalAuth, shippingPortalController.getFailureReasons);
router.post('/failure-reasons', ...portalAuth, shippingPortalController.createFailureReason);
router.patch('/failure-reasons/:id', ...portalAuth, shippingPortalController.updateFailureReason);

// Status Update, Reattempt, Reship & Status Counts (SHIP-T1 / Turbo Reference)
router.get('/status-counts', ...portalAuth, shippingPortalController.getStatusCounts);
router.patch('/shipments/:id/status', ...portalAuth, shippingPortalController.updateShipmentStatus);
router.post('/shipments/:id/status', ...portalAuth, shippingPortalController.updateShipmentStatus);
router.post('/shipments/:id/reattempt', ...portalAuth, shippingPortalController.reattemptShipment);
router.post('/shipments/:id/reship', ...portalAuth, shippingPortalController.reshipShipment);

// Automated RTO Maintenance (SHIP-W3)
router.post('/maintenance/run-rto', ...portalAuth, shippingPortalController.runRtoMaintenance);

// Settlements & Statements (SHIP-W5)
router.use('/settlements', ...portalAuth, require('./shippingPortalSettlementRoutes'));

// Policy Settings (SHIP-W1A / SHIP-UAT-2)
router.get(['/policy', '/policy-settings', '/settings/policy'], ...portalAuth, async (req, res) => {
  try {
    const policyService = require('../services/shipping/policyService');
    const policy = await policyService.getPolicy(req.user.companyId);
    return res.json({ success: true, data: policy, policy });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.put(['/policy', '/policy-settings', '/settings/policy'], ...portalAuth, async (req, res) => {
  try {
    const policyService = require('../services/shipping/policyService');
    const updated = await policyService.updatePolicy(req.user.companyId, req.body);
    return res.json({ success: true, data: updated, policy: updated, message: 'تم تحديث سياسة الشحن بنجاح' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});


// ============================================================================
// Extra Services, Open Package Requests & Order Change Requests (SHIP-T3)
// ============================================================================

// Extra Services CRUD
router.get('/services', ...portalAuth, shippingExtraServicesController.listServices);
router.post('/services', ...portalAuth, shippingExtraServicesController.createService);
router.get('/services/:id', ...portalAuth, shippingExtraServicesController.getServiceById);
router.put('/services/:id', ...portalAuth, shippingExtraServicesController.updateService);
router.delete('/services/:id', ...portalAuth, shippingExtraServicesController.deleteService);

// Shipment Service Lines
router.post('/shipments/:id/services', ...portalAuth, shippingExtraServicesController.addShipmentService);
router.get('/shipments/:id/services', ...portalAuth, shippingExtraServicesController.listShipmentServices);
router.delete('/shipments/:id/services/:lineId', ...portalAuth, shippingExtraServicesController.removeShipmentService);
router.get('/get-additional-fees', ...portalAuth, shippingExtraServicesController.getAdditionalFees);

// Package Open Requests Workflow
router.post('/shipments/:id/open-request', ...portalAuth, shippingExtraServicesController.createPackageOpenRequest);
router.post('/open-package-requests', ...portalAuth, shippingExtraServicesController.createPackageOpenRequest);
router.get('/open-package-requests', ...portalAuth, shippingExtraServicesController.listPackageOpenRequests);
router.get('/order/get-open-shipment-requests', ...portalAuth, shippingExtraServicesController.listPackageOpenRequests);
router.post('/open-package-requests/:id/review', ...portalAuth, shippingExtraServicesController.reviewPackageOpenRequest);
router.post('/open-package-requests/:id/approve', ...portalAuth, shippingExtraServicesController.approvePackageOpenRequest);
router.post('/open-package-requests/:id/reject', ...portalAuth, shippingExtraServicesController.rejectPackageOpenRequest);

// Order Change Requests Workflow
router.post('/shipments/:id/change-request', ...portalAuth, shippingExtraServicesController.createOrderChangeRequest);
router.post('/order-change-requests', ...portalAuth, shippingExtraServicesController.createOrderChangeRequest);
router.get('/order-change-requests', ...portalAuth, shippingExtraServicesController.listOrderChangeRequests);
router.get('/order/get_order_change_requests', ...portalAuth, shippingExtraServicesController.listOrderChangeRequests);
router.post('/order-change-requests/:id/review', ...portalAuth, shippingExtraServicesController.reviewOrderChangeRequest);
router.post('/order-change-requests/:id/approve', ...portalAuth, shippingExtraServicesController.approveOrderChangeRequest);
router.post('/order-change-requests/:id/reject', ...portalAuth, shippingExtraServicesController.rejectOrderChangeRequest);

// Company Wallet & Transactions Ledger (SHIP-T2)
const walletController = require('../controller/walletController');
router.get('/wallet', ...portalAuth, walletController.getWalletSummary);
router.get('/wallet/transactions', ...portalAuth, walletController.getTransactions);
router.get('/wallet/fees', ...portalAuth, shippingPortalController.getWalletFeesReport);
router.post('/wallet/adjust', ...portalAuth, walletController.adjustBalance);
router.post('/shipments/:id/confirm-open', ...portalAuth, shippingPortalController.confirmOpenPackage);
router.post('/shipments/:id/collect', ...portalAuth, shippingPortalController.collectShipmentCod);

// Store Integrations (SHIP-T5)
router.use('/integrations', require('./integrationRoutes'));

// SHIP-T4 International Shipments & Customs Acknowledgments
router.post('/shipments/:id/international', ...portalAuth, shippingPortalController.convertToInternational);
router.get('/international/pending', ...portalAuth, shippingPortalController.getPendingInternational);
router.patch('/international/:id/review', ...portalAuth, shippingPortalController.reviewInternationalAck);

module.exports = router;
