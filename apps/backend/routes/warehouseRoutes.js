const express = require('express');
const router = express.Router();
const warehouseController = require('../controller/warehouseController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.use(verifyToken.authenticateToken);

router.get('/', warehouseController.getWarehouses);
router.post('/', checkAppAccess('inventory-pro'), warehouseController.createWarehouse);
router.put('/:id', checkAppAccess('inventory-pro'), warehouseController.updateWarehouse);
router.delete('/:id', checkAppAccess('inventory-pro'), warehouseController.deleteWarehouse);

module.exports = router;
