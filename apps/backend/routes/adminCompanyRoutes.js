const express = require('express');
const router = express.Router();
const adminCompnayController = require('../controller/adminCompnayController');
const companiesController = require('../controller/companiesController'); // Use existing controller
const verifyToken = require("../utils/verifyToken")
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// Get statistics (for Super Admin dashboard)
router.get('/statistics', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, cacheMiddleware(60000), adminCompnayController.getStatistics);

// Get all companies (for Super Admin dashboard)
router.get('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getAllCompanies);

// Search Facebook pages globally (by name or ID)
router.get('/facebook-pages/search', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.searchFacebookPages);

// General Bulk Operations
router.post('/bulk-delete', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.bulkDeleteCompanies);
router.put('/bulk-status', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.bulkUpdateCompanyStatus);
router.get('/follow-up-owners', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getFollowUpOwners);
router.put('/:companyId/follow-up', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.updateCompanyFollowUp);

router.get('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getCompanyDetails);

router.post('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.createNewCompany);

router.put('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.updateCompany);

router.delete('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.deleteCompany);

// Get Facebook pages for a company
router.get('/:companyId/facebook-pages', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getCompanyFacebookPages);

// Login as company admin
router.post('/:companyId/login-as-admin', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.loginAsCompanyAdmin);

// Get Company Users (Reuse companiesController)
router.get('/:companyId/users', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.getCompanyUsers);


// Transfer ownership
router.post('/:companyId/transfer-ownership', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.forceTransferOwnership);

// Add employee to company
router.post('/:companyId/employees', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.addEmployeeToCompany);

// Delete user from company
router.delete('/:companyId/users/:userId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.deleteUser);

// Toggle company feature flag (e.g. aiToolsEnabled)
router.put('/:companyId/features', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.toggleCompanyFeature);

module.exports = router;
