const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingBranchesController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllBranches);
router.post('/', verifyToken.authenticateToken, controller.createBranch);
router.put('/:id', verifyToken.authenticateToken, controller.updateBranch);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteBranch);

module.exports = router;
