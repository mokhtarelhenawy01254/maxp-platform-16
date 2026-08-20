const express = require('express');
const router = express.Router();
const controller = require('../controller/labSampleTypesController');
const verifyToken = require('../utils/verifyToken');

const MANAGER = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllSampleTypes);
router.post('/', verifyToken.requireRole(MANAGER), controller.createSampleType);
router.put('/:id', verifyToken.requireRole(MANAGER), controller.updateSampleType);
router.delete('/:id', verifyToken.requireRole(MANAGER), controller.deleteSampleType);

module.exports = router;
