const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyLabelsController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.get('/studies/:id/label', controller.getStudyLabel);

module.exports = router;
