const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const verifyToken = require("../utils/verifyToken");
const { userValidationRules, validate } = require('../middleware/inputValidation');

// 🔐 Rate limit خفيف على مسارات المصادقة الحساسة (10/دقيقة لكل IP) — إبطاء brute force
// بدون قفل مكاتب/NAT كاملة (ألطف من rateLimits.auth البديل 3/30د).
const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_RATE_MAX = 10;
const authRateBucket = new Map();
const authRateLimiter = (req, res, next) => {
  // 🔑 الهوية الموثوقة: Cloudflare بيكتب CF-Connecting-IP وبيقدرش يتزوير من غيره،
  // وأول X-Forwarded-For بيكتبه العميل نفسه (بيتعادى بيه الـ limiter) — فبناخد آخر entry
  // (اللي الـ proxy ضافه) كبديل.
  const xffEntries = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const ip =
    String(req.headers['cf-connecting-ip'] || '').trim() ||
    xffEntries[xffEntries.length - 1] ||
    req.ip ||
    'unknown';
  const now = Date.now();
  const key = `auth:${ip}`;
  const timestamps = (authRateBucket.get(key) || []).filter((ts) => now - ts < AUTH_RATE_WINDOW_MS);
  if (timestamps.length >= AUTH_RATE_MAX) {
    const retryAfter = Math.max(1, Math.ceil((timestamps[0] + AUTH_RATE_WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      message: 'محاولات كتير جدًا — استنى دقيقة وجرب تاني'
    });
  }
  timestamps.push(now);
  authRateBucket.set(key, timestamps);
  if (authRateBucket.size > 5000) {
    for (const [bucketKey, bucketTimestamps] of authRateBucket) {
      if (bucketTimestamps.every((ts) => now - ts >= AUTH_RATE_WINDOW_MS)) {
        authRateBucket.delete(bucketKey);
      }
    }
  }
  next();
};

// Basic auth routes
router.get('/business-specialties', authController.getBusinessSpecialties);



router.post('/register', userValidationRules(), validate, authController.register);
router.post('/signup-coupon/validate', authController.validateSignupCoupon);
router.post('/login', authRateLimiter, authController.login);
router.get('/me', verifyToken.authenticateToken, authController.me);
router.post('/refresh', authController.refresh);
router.post('/logout', verifyToken.authenticateToken, authController.logout);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.get('/verify-email', authController.verifyEmail);
router.post('/send-verification', authController.sendVerificationEmail);
router.put('/change-password', verifyToken.authenticateToken, authController.changePassword);

// Multi-company routes (تعدد الشركات)
router.get('/companies', verifyToken.authenticateToken, authController.getUserCompanies);                    // Get all companies for user
router.post('/switch-company/:companyId', verifyToken.authenticateToken, authController.switchCompany);      // Switch to a different company
router.post('/user-company', verifyToken.authenticateToken, authController.addUserToCompany);                // Add user to a company (Admin)
router.delete('/user-company/:userId/:companyId', verifyToken.authenticateToken, authController.removeUserFromCompany); // Remove user from company
router.post('/set-primary-company', verifyToken.authenticateToken, authController.setPrimaryCompany);         // Set user's primary company to system company (Super Admin)
router.post('/set-default-company/:companyId', verifyToken.authenticateToken, authController.setDefaultCompany); // تعيين الشركة الافتراضية

module.exports = router;
