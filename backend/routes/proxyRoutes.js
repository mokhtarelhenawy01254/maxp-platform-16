const express = require('express');
const router = express.Router();
const proxyImageController = require('../controller/proxyImageController');

router.get('/', proxyImageController.proxyImage);
router.head('/', proxyImageController.proxyImage);

module.exports = router;
