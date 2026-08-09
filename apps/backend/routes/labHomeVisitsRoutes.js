const express = require('express');
const router = express.Router();
const controller = require('../controller/labHomeVisitsController');
const verifyToken = require('../utils/verifyToken');

const MANAGER = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllVisits);
router.post('/', verifyToken.authenticateToken, controller.createVisit);
router.put('/:id', verifyToken.authenticateToken, controller.updateVisit);
router.delete('/:id', verifyToken.requireRole(MANAGER), controller.deleteVisit);

module.exports = router;
