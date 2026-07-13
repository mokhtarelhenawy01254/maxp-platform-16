const express = require('express');
const router = express.Router();
const permissionController = require('../controller/permissionController');
const verifyToken = require("../utils/verifyToken");

// ── Permissions (requires auth + company access; COMPANY_ADMIN needs to see available permissions) ──
router.get('/', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, permissionController.listPermissions);

// ── Company Roles ───────────────────────────────────────────
router.get('/companies/:companyId/roles', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, permissionController.listRoles);
router.post('/companies/:companyId/roles', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), permissionController.createRole);
router.put('/companies/:companyId/roles/:roleId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), permissionController.updateRole);
router.delete('/companies/:companyId/roles/:roleId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), permissionController.deleteRole);

// ── User Role Assignment ────────────────────────────────────
router.put('/companies/:companyId/users/:userId/role', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), permissionController.setUserRole);

module.exports = router;
