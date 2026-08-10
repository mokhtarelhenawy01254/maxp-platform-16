const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingPriceListsController');
const verifyToken = require('../utils/verifyToken');

const STAFF_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.get('/', verifyToken.authenticateToken, controller.getAllPriceLists);
router.post('/', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.createPriceList);
router.get('/resolve/:serviceId', verifyToken.authenticateToken, controller.resolveServicePrice);
router.put('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.updatePriceList);
router.delete('/:id', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.deletePriceList);
router.get('/:id/items', verifyToken.authenticateToken, controller.getPriceListItems);
router.put('/:id/items/:serviceId', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.setPriceListItem);
router.delete('/:id/items/:serviceId', verifyToken.authenticateToken, verifyToken.requireRole(STAFF_ROLES), controller.removePriceListItem);

module.exports = router;
