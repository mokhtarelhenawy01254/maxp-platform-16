const express = require('express');
const router = express.Router();
const controller = require('../controller/educationSessionsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.post('/', verifyToken.authenticateToken, controller.create);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.put('/:id/confirm', verifyToken.authenticateToken, controller.confirm);
router.put('/:id/cancel', verifyToken.authenticateToken, controller.cancel);
router.delete('/:id', verifyToken.authenticateToken, controller.remove);

module.exports = router;
