const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingBranchesController');
const verifyToken = require('../utils/verifyToken');
const { upload } = require('../middleware/bookingBranchUpload');

router.get('/', verifyToken.authenticateToken, controller.getAllBranches);
router.post('/', verifyToken.authenticateToken, upload.single('landmarkImage'), controller.createBranch);
router.put('/:id', verifyToken.authenticateToken, upload.single('landmarkImage'), controller.updateBranch);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteBranch);

module.exports = router;
