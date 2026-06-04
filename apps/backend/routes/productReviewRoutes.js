const express = require('express');
const router = express.Router();
const productReviewController = require('../controller/productReviewController');

/**
 * 🔐 Admin Routes للتقييمات والمراجعات (Protected)
 * Note: These routes are mounted at /api/v1/reviews in server.js
 * They are protected by globalSecurity middleware (includes globalAuthentication)
 */

// Get all reviews (Admin)
// Note: globalSecurity middleware handles authentication, no need for requireAuth here
router.get('/', productReviewController.getAllReviews);

// Bulk Action (Admin) - Must be before dynamic routes
router.post('/bulk-action', productReviewController.bulkAction);

// Approve review (Admin)
router.put('/:reviewId/approve', productReviewController.approveReview);

// Reject review (Admin)
router.put('/:reviewId/reject', productReviewController.rejectReview);

// Delete review (Admin)
router.delete('/:reviewId', productReviewController.deleteReview);

module.exports = router;

