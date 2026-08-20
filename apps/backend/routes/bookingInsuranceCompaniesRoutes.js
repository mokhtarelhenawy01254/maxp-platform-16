const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingInsuranceCompaniesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllInsuranceCompanies);
router.post('/', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.createInsuranceCompany);
router.put('/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.updateInsuranceCompany);
router.delete('/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.deleteInsuranceCompany);

module.exports = router;
