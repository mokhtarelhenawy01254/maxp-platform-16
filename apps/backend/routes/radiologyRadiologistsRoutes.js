const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyRadiologistsController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

router.get('/radiologists', controller.listRadiologists);
router.post('/radiologists', verifyToken.requireRole(MANAGER_ROLES), controller.createRadiologist);
router.put('/radiologists/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateRadiologist);
router.delete('/radiologists/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteRadiologist);

router.put('/studies/:id/radiologist', verifyToken.requireRole(MANAGER_ROLES), controller.assignRadiologist);

module.exports = router;
