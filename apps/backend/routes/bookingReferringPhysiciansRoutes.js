const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingReferringPhysiciansController');
const verifyToken = require('../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllReferringPhysicians);
router.post('/', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.createReferringPhysician);
router.put('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.updateReferringPhysician);
router.delete('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.deleteReferringPhysician);

module.exports = router;
