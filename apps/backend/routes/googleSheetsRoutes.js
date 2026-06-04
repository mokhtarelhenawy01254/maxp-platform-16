const express = require('express');
const verifyToken = require('../utils/verifyToken');
const googleSheetsController = require('../controller/googleSheetsController');

const router = express.Router();

router.post('/preview', verifyToken.authenticateToken, googleSheetsController.previewSheet);
router.post('/import/products', verifyToken.authenticateToken, googleSheetsController.importProductsFromSheet);
router.post('/import/orders', verifyToken.authenticateToken, googleSheetsController.importOrdersFromSheet);
router.get('/export/products', verifyToken.authenticateToken, googleSheetsController.exportProductsToCsv);
router.get('/export/orders', verifyToken.authenticateToken, googleSheetsController.exportOrdersToCsv);
router.get('/template/products', verifyToken.authenticateToken, googleSheetsController.downloadProductsTemplate);
router.get('/template/orders', verifyToken.authenticateToken, googleSheetsController.downloadOrdersTemplate);

module.exports = router;
