const express = require('express');
const router = express.Router();
const controller = require('../controller/labCulturesController');
const verifyToken = require('../utils/verifyToken');

const MANAGER = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllCultures);
router.get('/:id', verifyToken.authenticateToken, controller.getCultureById);
router.post('/', verifyToken.requireRole(MANAGER), controller.createCulture);
router.put('/:id', verifyToken.requireRole(MANAGER), controller.updateCulture);
router.delete('/:id', verifyToken.requireRole(MANAGER), controller.deleteCulture);
router.post('/:id/organisms', verifyToken.requireRole(MANAGER), controller.addOrganism);
router.delete('/:id/organisms/:organismId', verifyToken.requireRole(MANAGER), controller.removeOrganism);
router.post('/:id/antibiotics', verifyToken.requireRole(MANAGER), controller.addAntibiotic);
router.delete('/:id/antibiotics/:antibioticId', verifyToken.requireRole(MANAGER), controller.removeAntibiotic);

module.exports = router;
