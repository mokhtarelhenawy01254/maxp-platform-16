const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const verifyToken = require("../utils/verifyToken");
const { userValidationRules, validate } = require('../middleware/inputValidation');

// Basic auth routes
router.get('/business-specialties', authController.getBusinessSpecialties);
router.post('/register', userValidationRules(), validate, authController.register);
router.post('/signup-coupon/validate', authController.validateSignupCoupon);
router.post('/login', authController.login);
router.get('/me', verifyToken.authenticateToken, authController.me);
router.post('/refresh', authController.refresh);
router.post('/logout', verifyToken.authenticateToken, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
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
