const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingServicesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllServices);
router.post('/', verifyToken.authenticateToken, controller.createService);
router.post('/:id/clone', verifyToken.authenticateToken, controller.cloneService);
router.get('/:id/branches', verifyToken.authenticateToken, controller.getServiceBranches);
router.post('/:id/branches', verifyToken.authenticateToken, controller.addServiceBranch);
router.put('/:id/branches/:branchId', verifyToken.authenticateToken, controller.updateServiceBranch);
router.delete('/:id/branches/:branchId', verifyToken.authenticateToken, controller.removeServiceBranch);
router.put('/:id', verifyToken.authenticateToken, controller.updateService);
router.patch('/:id/toggle', verifyToken.authenticateToken, controller.toggleService);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteService);

module.exports = router;
