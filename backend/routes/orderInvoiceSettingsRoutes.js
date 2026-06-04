const express = require('express');
const router = express.Router();
const orderInvoiceSettingsController = require('../controller/orderInvoiceSettingsController');
const { requireAuth } = require('../middleware/auth');
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.getSettings);

router.put('/', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.updateSettings);

router.post('/reset', requireAuth, checkAppAccess('order-invoicing'), orderInvoiceSettingsController.resetSettings);

module.exports = router;

