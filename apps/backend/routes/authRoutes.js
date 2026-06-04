const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { requireAuth } = require('../middleware/auth');

// Basic auth routes
router.get('/business-specialties', authController.getBusinessSpecialties);
router.post('/register', authController.register);
router.post('/signup-coupon/validate', authController.validateSignupCoupon);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/refresh', authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.put('/change-password', requireAuth, authController.changePassword);

// Multi-company routes (تعدد الشركات)
router.get('/companies', requireAuth, authController.getUserCompanies);                    // Get all companies for user
router.post('/switch-company/:companyId', requireAuth, authController.switchCompany);      // Switch to a different company
router.post('/user-company', requireAuth, authController.addUserToCompany);                // Add user to a company (Admin)
router.delete('/user-company/:userId/:companyId', requireAuth, authController.removeUserFromCompany); // Remove user from company
router.post('/set-primary-company', requireAuth, authController.setPrimaryCompany);         // Set user's primary company to system company (Super Admin)
router.post('/set-default-company/:companyId', requireAuth, authController.setDefaultCompany); // تعيين الشركة الافتراضية

module.exports = router;
