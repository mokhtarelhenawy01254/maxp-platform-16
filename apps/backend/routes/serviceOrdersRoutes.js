const express = require('express');
const router = express.Router();
const controller = require('../controller/serviceOrdersController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.post('/', controller.createPublic); // Public - no auth needed
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.put('/:id/status', verifyToken.authenticateToken, controller.updateStatus);

module.exports = router;
