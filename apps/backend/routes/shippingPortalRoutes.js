/**
 * Shipping Portal Routes (SHIP-W1A)
 * Standalone shipments, rate-card quote, and parcel tracking
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');
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

// Shipment list and details
router.get('/shipments', ...portalAuth, shippingPortalController.getShipments);
router.get('/shipments/:id', ...portalAuth, shippingPortalController.getShipmentById);

module.exports = router;
