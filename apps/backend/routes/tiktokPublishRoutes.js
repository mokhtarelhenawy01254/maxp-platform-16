const express = require('express');
const router = express.Router();
const controller = require('../controller/tiktokPublishController');
const verifyToken = require('../utils/verifyToken');

router.get('/account', verifyToken.authenticateToken, controller.getAccountStatus);
router.post('/', verifyToken.authenticateToken, controller.createPublish);
router.get('/', verifyToken.authenticateToken, controller.listPosts);
router.get('/:id', verifyToken.authenticateToken, controller.getPost);
router.post('/:id/refresh', verifyToken.authenticateToken, controller.refreshPost);

module.exports = router;
