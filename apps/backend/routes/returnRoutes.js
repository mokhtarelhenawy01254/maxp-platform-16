const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Return Reason Categories
router.get('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getCategories);
router.post('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createCategory);
router.put('/categories/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateCategory);

// Return Reasons
router.get('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnReasons);
router.post('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createReturnReason);
router.put('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnReason);
router.delete('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.deleteReturnReason);

// Return Requests
router.get('/requests', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnRequests);
router.post('/requests', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.createReturnRequest);
router.put('/requests/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnRequest);

// Return Settings
router.get('/settings', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getReturnSettings);
router.put('/settings', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.updateReturnSettings);

// Return Operations (Contact & History)
router.post('/requests/:id/contact', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.addContactAttempt);
router.get('/requests/:id/contacts', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getContactHistory);
router.get('/requests/:id/activity', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getActivityLog);

// Employee Performance Report
router.get('/employee-performance', verifyToken.authenticateToken, checkAppAccess('order-core'), returnController.getEmployeePerformance);

// Public Routes (Self-Service)
router.post('/public/request', returnController.createPublicReturnRequest);
router.get('/public/reasons', async (req, res) => {
    // Need a way to filter by company, pass companyId in query? 
    // For now allow getting all active reasons if simplified, or require companyId
    // Security consideration: listing reasons might expose company data? Unlikely critical.
    // Let's defer implementation or keep it simple.
    res.status(501).json({ error: 'Not implemented' });
});

module.exports = router;
