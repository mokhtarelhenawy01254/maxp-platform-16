const express = require('express');
const router = express.Router();
const companyConnectionController = require('../controller/companyConnectionController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

// Requests
router.get('/requests', companyConnectionController.getReceivedRequests);
router.post('/requests', companyConnectionController.sendConnectionRequest);
router.get('/requests/received', companyConnectionController.getReceivedRequests);
router.put('/requests/:id/respond', companyConnectionController.respondToRequest);

// Connections
router.get('/active', companyConnectionController.getActiveConnections);
router.get('/consumers', companyConnectionController.getConsumers);
router.put('/:id/permissions', companyConnectionController.updatePermissions);
router.delete('/:id', companyConnectionController.deleteConnection);

// Company Affiliates (Dashboard)
router.get('/affiliates', companyConnectionController.getCompanyAffiliates);

// Data Pulling
router.get('/:providerId/products', companyConnectionController.fetchProductsFromProvider);
router.post('/:providerId/import', companyConnectionController.importInternalProducts);

module.exports = router;
