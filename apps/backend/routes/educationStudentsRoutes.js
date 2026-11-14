const express = require('express');
const router = express.Router();
const controller = require('../controller/educationStudentsController');
const verifyToken = require('../utils/verifyToken');
const requireEducationAppInstalled = require('../middleware/requireEducationAppInstalled');

router.use(verifyToken.authenticateToken, requireEducationAppInstalled);

router.get('/guardians/search', verifyToken.authenticateToken, controller.searchGuardians);
router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.post('/', verifyToken.authenticateToken, controller.create);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.delete('/:id', verifyToken.authenticateToken, controller.remove);

module.exports = router;
