const express = require('express');
const router = express.Router();
const controller = require('../controller/publicBookingController');
const { createRateLimiter } = require('../middleware/rateLimiter');

const limiter = createRateLimiter();

router.get('/branches', limiter, controller.getBranches);
router.get('/doctors', limiter, controller.getDoctors);
router.get('/services', limiter, controller.getServices);
router.get('/service-categories', limiter, controller.getServiceCategories);
router.get('/slots', limiter, controller.getAvailableSlots);
router.get('/info', limiter, controller.getInfo);
router.post('/appointments', limiter, controller.createAppointment);

module.exports = router;
