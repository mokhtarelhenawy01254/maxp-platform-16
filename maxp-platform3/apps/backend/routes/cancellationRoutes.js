const express = require('express');
const router = express.Router();
const cancellationController = require('../controller/cancellationController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

router.get('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.getCategories);
router.post('/categories', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.createCategory);
router.put('/categories/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.updateCategory);

router.get('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.getReasons);
router.post('/reasons', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.createReason);
router.put('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.updateReason);
router.delete('/reasons/:id', verifyToken.authenticateToken, checkAppAccess('order-core'), cancellationController.deleteReason);

module.exports = router;
