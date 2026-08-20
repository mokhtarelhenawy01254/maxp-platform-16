const express = require('express');
const router = express.Router();
const tiktokAuthController = require('../controller/tiktokAuthController');
const verifyToken = require('../utils/verifyToken');

router.get('/login', tiktokAuthController.login);
router.get('/callback', tiktokAuthController.callback);
router.get('/me', verifyToken.authenticateToken, tiktokAuthController.me);

module.exports = router;
