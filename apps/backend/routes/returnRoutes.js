const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Return Reason Categories
router.get('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getCategories);
router.post('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createCategory);
router.put('/categories/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateCategory);
router.delete('/categories/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.deleteCategory);

// Return Reasons
router.get('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnReasons);
router.post('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createReturnReason);
router.put('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnReason);
router.delete('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.deleteReturnReason);

// Return Requests
router.get('/requests', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnRequests);
router.get('/requests/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnRequest);
router.post('/requests', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createReturnRequest);
router.put('/requests/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnRequest);

// Return Settings
router.get('/settings', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnSettings);
router.put('/settings', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnSettings);
router.get('/settings/rating-health', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getRatingHealth);

// Return Types (أنواع المرتجع حسب شركة الشحن)
router.get('/return-types', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnTypes);
router.post('/return-types', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createReturnType);
router.put('/return-types/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnType);
router.delete('/return-types/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.deleteReturnType);
router.get('/return-shipping-companies', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnShippingCompanies);

// Return Operations (Contact & History)
router.post('/requests/:id/contact', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.addContactAttempt);
router.get('/requests/:id/contacts', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getContactHistory);
router.get('/requests/:id/activity', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getActivityLog);

// Employee Performance Report
router.get('/employee-performance', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getEmployeePerformance);

// Public Routes (Self-Service)
router.post('/public/request', returnController.createPublicReturnRequest);
router.get('/public/reasons', returnController.getPublicReasons);

module.exports = router;
