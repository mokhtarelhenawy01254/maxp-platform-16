const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');
const verifyToken = require("../utils/verifyToken");

// Public routes
router.get('/', faqController.getFAQs);
router.get('/categories', faqController.getFAQCategories);
router.post('/:faqId/rate', faqController.rateFAQ);

// Admin routes (require authentication)
router.post('/', verifyToken.authenticateToken, faqController.createFAQ);
router.put('/:faqId', verifyToken.authenticateToken, faqController.updateFAQ);
router.delete('/:faqId', verifyToken.authenticateToken, faqController.deleteFAQ);
router.get('/admin/all', verifyToken.authenticateToken, faqController.getAllFAQsForAdmin);

module.exports = router;
