const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const verifyToken = require('../utils/verifyToken');
const courierPortalController = require('../controller/courierPortalController');

// 🚦 Rate limit: 5 attempts per minute per IP + phone
const courierLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const phone = String(req.body?.phone || '').trim().replace(/[\s\-\+]/g, '');
    const clientIp = ipKeyGenerator(req, res);
    return `courier_login_${clientIp}_${phone}`;
  },
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من محاولات الدخول (5 محاولات في الدقيقة). يرجى الانتظار لمدة دقيقة.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Public authentication routes
router.post('/login', courierLoginLimiter, courierPortalController.login);
router.post('/logout', courierPortalController.logout);
router.post('/verify-link-pin', courierPortalController.verifyLinkPin);

// Failure reasons: accessible with token or with company context
router.get(
  '/failure-reasons',
  (req, res, next) => {
    // If authorization header present, verify token optionally
    if (req.headers.authorization) {
      return verifyToken.authenticateToken(req, res, next);
    }
    next();
  },
  courierPortalController.getFailureReasons
);

// Protected routes for authenticated couriers
router.use(verifyToken.authenticateToken);

router.get('/me', courierPortalController.getMe);
router.post('/sync', courierPortalController.syncOffline);

module.exports = router;
