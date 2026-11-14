const express = require('express');
const router = express.Router();
const controller = require('../controller/educationTeacherPaymentsController');
const verifyToken = require('../utils/verifyToken');
const requireEducationAppInstalled = require('../middleware/requireEducationAppInstalled');

router.use(verifyToken.authenticateToken, requireEducationAppInstalled);

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.post('/calculate', verifyToken.authenticateToken, controller.calculate);
router.post('/', verifyToken.authenticateToken, controller.create);
router.put('/:id/mark-paid', verifyToken.authenticateToken, controller.markPaid);

module.exports = router;
