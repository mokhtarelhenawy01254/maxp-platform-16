/**
 * Shipping Client Admin Routes (SHIP-W2C.1)
 * Administrative routes for managing shipping client (Merchant) accounts.
 * Accessible strictly by OWNER and COMPANY_ADMIN.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');
const shippingClientAdminController = require('../controller/shippingClientAdminController');

/**
 * Access guard allowing OWNER, COMPANY_ADMIN, or SUPER_ADMIN
 */
const requireOwnerOrCompanyAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'COMPANY_ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'غير مصرح: هذه العملية تتطلب صلاحيات إدارة الشركة (OWNER أو COMPANY_ADMIN)',
  });
};

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

// Rate limiter for account creation and password resets
const clientCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'تجاوزت الحد المسموح لإنشاء وإدارة حسابات العملاء. يرجى الانتظار قليلاً.',
  },
});

const adminAuth = [
  verifyToken.authenticateToken,
  requireOwnerOrCompanyAdmin,
  requireShippingAppAccess,
];

// 1. List clients with portal status, shipment counts & pending COD
router.get('/clients', ...adminAuth, shippingClientAdminController.listClients);

// 2. Create client + user with one-time temporary password
router.post('/clients', ...adminAuth, clientCreationLimiter, shippingClientAdminController.createClient);

// 3. Create or reset account password for existing client
router.post('/clients/:id/account', ...adminAuth, clientCreationLimiter, shippingClientAdminController.createOrResetAccount);

// 4. Toggle account active status (User + Merchant)
router.patch('/clients/:id/account', ...adminAuth, shippingClientAdminController.toggleAccountStatus);

// 5. Client shipment and performance summary
router.get('/clients/:id/summary', ...adminAuth, shippingClientAdminController.getClientSummary);

module.exports = router;
