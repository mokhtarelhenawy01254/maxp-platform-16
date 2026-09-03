const express = require('express');
const router = express.Router();
const controller = require('../controller/serviceOrdersController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.post('/', verifyToken.optionalAuth, controller.createPublic); // Public - optional auth for logged-in users
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.put('/:id/status', verifyToken.authenticateToken, controller.updateStatus);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteOrder);

module.exports = router;
