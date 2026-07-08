const express = require('express');
const router = express.Router();
const fbPostController = require('../controller/facebookPostController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/', verifyToken.authenticateToken, checkAppAccess('crm-basic'), fbPostController.getPosts);
router.post('/sync', verifyToken.authenticateToken, checkAppAccess('crm-basic'), fbPostController.syncPosts);
router.patch('/:id/product', verifyToken.authenticateToken, checkAppAccess('crm-basic'), fbPostController.toggleProduct);

module.exports = router;
