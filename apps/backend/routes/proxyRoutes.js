const express = require('express');
const router = express.Router();
const proxyImageController = require('../controller/proxyImageController');

router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

router.get('/', proxyImageController.proxyImage);
router.head('/', proxyImageController.proxyImage);

module.exports = router;
