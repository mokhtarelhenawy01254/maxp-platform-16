const express = require('express');
const router = express.Router();
const controller = require('../controller/formsController');
const { createRateLimiter } = require('../middleware/rateLimiter');

const limiter = createRateLimiter();

router.get('/:slug', limiter, controller.getPublic);
router.post('/:slug/submit', limiter, controller.submitPublic);

module.exports = router;
