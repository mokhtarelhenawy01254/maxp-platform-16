const express = require('express');
const router = express.Router();
const overlayCampaignController = require('../controller/overlayCampaignController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.get('/', overlayCampaignController.list);
router.post('/', overlayCampaignController.create);
router.get('/products/search', overlayCampaignController.searchProducts);
router.get('/:id', overlayCampaignController.getById);
router.put('/:id', overlayCampaignController.update);
router.delete('/:id', overlayCampaignController.delete);
router.post('/:id/products', overlayCampaignController.addProducts);
router.delete('/:id/products/:productId', overlayCampaignController.removeProduct);
router.post('/:id/apply', overlayCampaignController.applyOverlay);

module.exports = router;
