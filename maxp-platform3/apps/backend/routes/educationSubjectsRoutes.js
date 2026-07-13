const express = require('express');
const router = express.Router();
const controller = require('../controller/educationSubjectsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.post('/', verifyToken.authenticateToken, controller.create);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.delete('/:id', verifyToken.authenticateToken, controller.remove);

module.exports = router;
