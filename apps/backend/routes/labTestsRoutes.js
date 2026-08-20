const express = require('express');
const router = express.Router();
const controller = require('../controller/labTestsController');
const verifyToken = require('../utils/verifyToken');
const { requireRole } = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllTests);
router.get('/:id', verifyToken.authenticateToken, controller.getTestById);
router.post('/', verifyToken.requireRole(MANAGER_ROLES), controller.createTest);
router.put('/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateTest);
router.delete('/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteTest);
router.post('/:id/parameters', verifyToken.requireRole(MANAGER_ROLES), controller.addParameter);
router.put('/:id/parameters/:parameterId', verifyToken.requireRole(MANAGER_ROLES), controller.updateParameter);
router.delete('/:id/parameters/:parameterId', verifyToken.requireRole(MANAGER_ROLES), controller.removeParameter);

module.exports = router;
