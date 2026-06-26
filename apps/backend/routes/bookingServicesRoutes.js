const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingServicesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllServices);
router.post('/', verifyToken.authenticateToken, controller.createService);
router.put('/:id', verifyToken.authenticateToken, controller.updateService);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteService);

module.exports = router;
