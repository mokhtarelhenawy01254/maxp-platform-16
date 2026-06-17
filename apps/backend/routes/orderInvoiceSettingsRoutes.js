const express = require('express');
const router = express.Router();
const orderInvoiceSettingsController = require('../controller/orderInvoiceSettingsController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.getSettings);

router.put('/', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.updateSettings);

router.post('/reset', verifyToken.authenticateToken, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.resetSettings);

module.exports = router;

