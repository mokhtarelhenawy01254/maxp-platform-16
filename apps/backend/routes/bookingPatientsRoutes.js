const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingPatientsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllPatients);
router.get('/:id/full', verifyToken.authenticateToken, controller.getPatientFull);
router.get('/:id', verifyToken.authenticateToken, controller.getPatientById);
router.post('/:id/merge', verifyToken.authenticateToken, controller.mergePatients);
router.post('/', verifyToken.authenticateToken, controller.createPatient);
router.put('/:id', verifyToken.authenticateToken, controller.updatePatient);
router.delete('/:id', verifyToken.authenticateToken, controller.deletePatient);

module.exports = router;
