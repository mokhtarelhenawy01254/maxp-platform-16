const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingPatientDocumentsController');
const verifyToken = require('../utils/verifyToken');

router.get('/patient/:patientId', verifyToken.authenticateToken, controller.getPatientDocuments);
router.post('/', verifyToken.authenticateToken, controller.addPatientDocument);
router.delete('/:id', verifyToken.authenticateToken, controller.deletePatientDocument);

module.exports = router;
