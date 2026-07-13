const express = require('express');
const router = express.Router();
const errorController = require('../controller/errorController');

// Define route for logging errors
// POST /api/v1/errors/log
router.post('/log', errorController.logError);

module.exports = router;
