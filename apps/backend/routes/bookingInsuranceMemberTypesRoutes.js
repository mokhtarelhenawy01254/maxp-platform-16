const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingInsuranceMemberTypesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllMemberTypes);
router.post('/', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.createMemberType);
router.put('/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.updateMemberType);
router.delete('/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), controller.deleteMemberType);

module.exports = router;
