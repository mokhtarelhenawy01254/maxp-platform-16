const express = require('express');
const router = express.Router();
const controller = require('../controller/labContractsController');
const verifyToken = require('../utils/verifyToken');

const MANAGER = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllContracts);
router.post('/', verifyToken.requireRole(MANAGER), controller.createContract);
router.put('/:id', verifyToken.requireRole(MANAGER), controller.updateContract);
router.delete('/:id', verifyToken.requireRole(MANAGER), controller.deleteContract);

module.exports = router;
