const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingPriceListsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllPriceLists);
router.post('/', verifyToken.authenticateToken, controller.createPriceList);
router.get('/resolve/:serviceId', verifyToken.authenticateToken, controller.resolveServicePrice);
router.put('/:id', verifyToken.authenticateToken, controller.updatePriceList);
router.delete('/:id', verifyToken.authenticateToken, controller.deletePriceList);
router.get('/:id/items', verifyToken.authenticateToken, controller.getPriceListItems);
router.put('/:id/items/:serviceId', verifyToken.authenticateToken, controller.setPriceListItem);
router.delete('/:id/items/:serviceId', verifyToken.authenticateToken, controller.removePriceListItem);

module.exports = router;
