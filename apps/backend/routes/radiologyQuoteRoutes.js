const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyQuoteController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.post('/quotes/preview', controller.previewQuote);

module.exports = router;
