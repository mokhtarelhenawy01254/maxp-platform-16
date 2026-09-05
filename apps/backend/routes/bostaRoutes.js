const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const bostaController = require('../controller/bostaController');

router.get('/orders/:orderId', verifyToken.authenticateToken, bostaController.getOrderShipment);
router.post('/orders/:orderId/shipment', verifyToken.authenticateToken, bostaController.createShipment);
router.post('/bulk/create-shipments', verifyToken.authenticateToken, bostaController.bulkCreateShipments);
router.get('/track/:trackingNumber', verifyToken.authenticateToken, bostaController.trackShipment);
router.post('/cancel/:deliveryId', verifyToken.authenticateToken, bostaController.cancelShipment);
router.get('/awb/:deliveryId', verifyToken.authenticateToken, bostaController.printAWB);
router.get('/cities', verifyToken.authenticateToken, bostaController.getCities);
router.get('/cities/:cityId/zones', verifyToken.authenticateToken, bostaController.getCityZones);

module.exports = router;
