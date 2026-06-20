const express = require('express');
const router = express.Router();
const companiesController = require('../controller/companiesController');
const verifyToken = require("../utils/verifyToken")
const { cacheMiddleware } = require('../middleware/performanceOptimization');
const uploadCompanyLogo = require('../middleware/companyLogoUpload');

// Validation middleware to reject null/undefined/invalid company IDs
const validateCompanyId = (req, res, next) => {
  const companyId = req.params.id || req.params.companyId;
  
  if (companyId === 'null' || companyId === 'undefined' || companyId === null || companyId === undefined) {
    return res.status(400).json({
      success: false,
      message: 'معرف الشركة غير صالح',
      error: 'INVALID_COMPANY_ID'
    });
  }
  
  next();
};

// Apply caching to frequently accessed company routes
router.get('/current', verifyToken.authenticateToken, cacheMiddleware(120000), companiesController.getCurrentCompany); // 2 minutes cache
router.get('/1', companiesController.REMOVEDDangerousFallbackEndpoint);
router.get('/:id/usage', validateCompanyId, cacheMiddleware(60000), companiesController.companyUsageEndpoint); // 1 minute cache
router.get('/1/usage-mock', companiesController.mockEndpoint);
router.get('/usage-safe', cacheMiddleware(60000), companiesController.safeUsageEndpoint); // 1 minute cache
// ponytail: /plans route removed — plan system deleted
router.get('/:id/info', validateCompanyId, verifyToken.authenticateToken, cacheMiddleware(120000), companiesController.getCompanyInfoEndpoint); // 2 minutes cache
router.put('/:companyId/currency', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateCompanyCurrency);
////////////////////////////////////////////////////////////
router.get('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.getAllCompanies);
router.get('/:id', validateCompanyId, verifyToken.authenticateToken, companiesController.getCompanyDetails);
// ✅ RESTRICTED: Only SUPER_ADMIN can create companies directly
// Regular users get one company created during registration
router.post('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.createNewCompany);
router.put('/:companyId', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateCompany);
router.delete('/:id', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.deleteCompany);
// ==================== COMPANY USERS MANAGEMENT ====================
router.get('/:companyId/users', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyUsers);
router.get('/:companyId/users/statistics', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getUsersStatistics);
router.get('/:companyId/users/:userId', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getSingleUser);
router.post('/:companyId/users', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.createnewUserForCompany);
router.put('/:companyId/users/:userId', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateUser);
router.delete('/:companyId/users/:userId', validateCompanyId, verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.deleteUser);

// ==================== USER PROFILE ====================
router.put('/profile/me', verifyToken.authenticateToken, companiesController.updateMyProfile);

// ==================== ROLES & PERMISSIONS MANAGEMENT (Legacy) ====================
// Deprecated: Use /api/v1/permissions/companies/:companyId/roles instead
// GET kept for backward compatibility (reads from new DB + fallback to old JSON)
router.get('/:companyId/roles', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyRoles);

// ==================== OWNERSHIP MANAGEMENT ====================
router.post('/:companyId/transfer-ownership', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['OWNER']), companiesController.transferOwnership);

// ==================== USER INVITATIONS ROUTES ====================
router.get('/:companyId/invitations', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyInvitations);
router.post('/:companyId/invitations', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.sendUserInvitation);

router.delete('/:companyId/invitations/:invitationId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.cancelInvitation);

router.post('/:companyId/invitations/:invitationId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.resendInvitation);


router.get('/frontend-safe/:id/usage', companiesController.FrontendSpecificSafeEndpoint);

// ==================== SUBDOMAIN / SLUG MANAGEMENT ====================
router.put('/:companyId/slug', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateCompanySlug);
router.get('/:companyId/verify-dns', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.verifyCompanyDNS);
router.get('/slug/check-availability', companiesController.checkSlugAvailability);


// ==================== COMPANY LOGO UPLOAD ====================
router.post('/:companyId/logo', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, uploadCompanyLogo.single('logo'), companiesController.uploadCompanyLogo);

module.exports = router;
