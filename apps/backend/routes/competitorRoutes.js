const express = require('express');
const router = express.Router();
const controller = require('../controller/competitorController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/reports/all', controller.getAllReports);
router.get('/auto-discover', controller.autoDiscover);
router.get('/summary', controller.summary);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

router.get('/:id/products', controller.listProducts);
router.post('/:id/products', controller.addProduct);
router.get('/:id/products/:productId/price-history', controller.getPriceHistory);
router.get('/:id/ads', controller.listAds);
router.post('/:id/ads', controller.addAd);
router.post('/:id/reports/generate', controller.generateReport);
router.get('/:id/reports', controller.listReports);
router.get('/:id/features', controller.listFeatures);
router.post('/:id/features', controller.createFeature);
router.put('/:id/features/:featureId', controller.updateFeature);
router.delete('/:id/features/:featureId', controller.deleteFeature);

router.get('/:id/dev-recommendations', controller.getDevRecommendations);
router.put('/:id/dev-recommendations', controller.upsertDevRecommendationNotes);
router.post('/:id/dev-tasks', controller.addDevTask);
router.put('/:id/dev-tasks/:taskId', controller.updateDevTask);
router.put('/:id/dev-tasks/:taskId/toggle', controller.toggleDevTask);
router.delete('/:id/dev-tasks/:taskId', controller.deleteDevTask);

router.get('/:id/price-compare', controller.priceCompare);
router.get('/:id/battlecard', controller.getBattlecard);

router.get('/reports/all', controller.getAllReports);
router.get('/summary', controller.summary);

module.exports = router;
