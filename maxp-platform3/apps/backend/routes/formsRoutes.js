const express = require('express');
const router = express.Router();
const controller = require('../controller/formsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.post('/', verifyToken.authenticateToken, controller.create);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.delete('/:id', verifyToken.authenticateToken, controller.remove);
router.get('/:id/submissions', verifyToken.authenticateToken, controller.getSubmissions);
router.get('/:id/analytics', verifyToken.authenticateToken, controller.getAnalytics);

module.exports = router;
