const express = require('express');
const router = express.Router();
const controller = require('../controller/educationBranchesController');
const verifyToken = require('../utils/verifyToken');

// All Education Branch & Classroom routes require authenticated token
router.use(verifyToken.authenticateToken);

// Branches CRUD & Status Toggle
router.get('/', controller.getBranches);
router.post('/', controller.createBranch);
router.get('/:id', controller.getBranchById);
router.put('/:id', controller.updateBranch);
router.delete('/:id', controller.deleteBranch);
router.patch('/:id/toggle-status', controller.toggleBranchStatus);

module.exports = router;
