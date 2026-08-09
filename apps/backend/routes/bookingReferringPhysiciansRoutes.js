const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingReferringPhysiciansController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllReferringPhysicians);
router.post('/', verifyToken.authenticateToken, controller.createReferringPhysician);
router.put('/:id', verifyToken.authenticateToken, controller.updateReferringPhysician);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteReferringPhysician);

module.exports = router;
