const express = require('express');
const router = express.Router();
const tat = require('../controller/radiologyTatController');
const physicians = require('../controller/radiologyReferringPhysiciansController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

// Note: this router is expected to be mounted at /api/v1/radiology/intelligence (in server.js).
router.use(verifyToken.authenticateToken);

// تحليلات وقت الدوران (TAT)
router.get('/tat', verifyToken.requireRole(MANAGER_ROLES), tat.getTatStatistics);

// نتائج الأطباء المحوّلين
router.get('/referring-physicians/:id/results', verifyToken.requireRole(MANAGER_ROLES), physicians.getPhysicianResults);

module.exports = router;
