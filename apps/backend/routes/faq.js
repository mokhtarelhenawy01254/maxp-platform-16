const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');
const verifyToken = require("../utils/verifyToken");

// Public & Tenant-aware routes
router.get('/', verifyToken.optionalAuth, faqController.getFAQs);
router.get('/categories', verifyToken.optionalAuth, faqController.getFAQCategories);
router.post('/:faqId/rate', faqController.rateFAQ);

// Admin / Merchant routes (require authentication)
router.post('/', verifyToken.authenticateToken, faqController.createFAQ);
router.post('/batch', verifyToken.authenticateToken, faqController.batchCreateFAQs);
router.put('/:faqId', verifyToken.authenticateToken, faqController.updateFAQ);
router.delete('/:faqId', verifyToken.authenticateToken, faqController.deleteFAQ);
router.get('/admin/all', verifyToken.authenticateToken, faqController.getAllFAQsForAdmin);

module.exports = router;
