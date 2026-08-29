const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { requireCompanyAccess } = verifyToken;

const {
  getSettings,
  updateSettings,
  importProducts,
  listProducts,
  syncProducts,
  deleteProduct,
  resolveProduct,
} = require('../controller/amazonAffiliateController');

const gate = [verifyToken.authenticateToken, requireCompanyAccess, checkAppAccess('amazon-affiliate-pro')];

router.get('/settings', gate, getSettings);
router.put('/settings', gate, updateSettings);
router.post('/import', gate, importProducts);
router.get('/products', gate, listProducts);
router.post('/sync', gate, syncProducts);
router.delete('/products/:id', gate, deleteProduct);
router.get('/resolve', gate, resolveProduct);

module.exports = router;