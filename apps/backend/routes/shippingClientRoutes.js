/**
 * Shipping Client Routes (SHIP-W2C)
 * Dedicated self-service routes for shipping company clients (merchants)
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');
const shippingClientScope = require('../middleware/shippingClientScope');
const shippingClientController = require('../controller/shippingClientController');

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

const clientAuth = [
  verifyToken.authenticateToken,
  requireShippingAppAccess,
  shippingClientScope,
];

// Profile & Summary
router.get('/me', ...clientAuth, shippingClientController.getMe);
router.get('/summary', ...clientAuth, shippingClientController.getSummary);

// Shipments
router.get('/shipments', ...clientAuth, shippingClientController.getShipments);
router.get('/shipments/:id', ...clientAuth, shippingClientController.getShipmentById);
router.post('/shipments', ...clientAuth, shippingClientController.createShipment);

// Pickups
router.get('/pickups', ...clientAuth, shippingClientController.getPickups);
router.post('/pickups', ...clientAuth, shippingClientController.createPickup);

// Rate Card (Client's card only, no internal costs)
router.get('/rate-card', ...clientAuth, shippingClientController.getRateCard);

module.exports = router;
