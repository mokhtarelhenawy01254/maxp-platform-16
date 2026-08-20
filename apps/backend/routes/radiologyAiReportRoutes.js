const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyAiReportController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

router.post('/studies/:id/report/draft', controller.generateDraft);

module.exports = router;
