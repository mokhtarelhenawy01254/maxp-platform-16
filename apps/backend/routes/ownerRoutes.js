/**
 * Owner Routes
 * Routes for multi-company management (OWNER role only)
 */

const express = require('express');
const router = express.Router();
const ownerController = require('../controller/ownerController');
const verifyToken = require("../utils/verifyToken");
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// Middleware to ensure user is OWNER of at least one company
const requireOwnerRole = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'يجب تسجيل الدخول أولاً'
        });
    }

    // OWNER role or SUPER_ADMIN can access
    if (req.user.role === 'OWNER' || req.user.role === 'SUPER_ADMIN') {
        return next();
    }

    // Check if user is OWNER in any company
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const ownerCompanies = await prisma.userCompany.findFirst({
        where: {
            userId: req.user.id,
            role: 'OWNER',
            isActive: true
        }
    });

    if (!ownerCompanies) {
        return res.status(403).json({
            success: false,
            message: 'هذه الخدمة متاحة لمالكي الشركات فقط'
        });
    }

    next();
};

// Apply authentication to all routes
router.use(verifyToken.authenticateToken);

// Dashboard & Companies - Require OWNER role
router.get('/companies', requireOwnerRole, ownerController.getOwnerCompanies);
router.get('/dashboard', requireOwnerRole, cacheMiddleware(60000), ownerController.getOwnerDashboard);
router.post('/companies', requireOwnerRole, ownerController.createOwnerCompany);

// Users Management - Require OWNER role
router.get('/users', requireOwnerRole, ownerController.getOwnerUsers);

// Reports - Require OWNER role
router.get('/reports/sales', requireOwnerRole, ownerController.getOwnerSalesReport);
router.get('/reports/attendance', requireOwnerRole, ownerController.getOwnerAttendanceReport);
router.get('/reports/today-attendance', requireOwnerRole, ownerController.getOwnerTodayAttendance);

// Company Orders Details - ⚠️ CHANGED: Relaxed restriction to allow employees
// Uses requireCompanyAccess to ensure user belongs to the company, but doesn't need to be OWNER
router.get('/companies/:companyId/orders', verifyToken.requireCompanyAccess, ownerController.getCompanyOrdersDetails);

module.exports = router;
