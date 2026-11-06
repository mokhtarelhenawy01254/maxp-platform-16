/**
 * Public Customer Feedback Routes (SHIP-T4)
 * Allows end-customers to view shipment info and submit ratings via token without authentication.
 * Prefix: /public/feedback or /api/v1/public/feedback
 */

const express = require('express');
const router = express.Router();
const feedbackService = require('../services/shipping/feedbackService');

/**
 * GET /public/feedback/:token
 * Public lookup: returns masked shipment info & existing rating if any
 */
router.get('/:token', async (req, res) => {
  try {
    const feedback = await feedbackService.getFeedbackByToken(req.params.token);
    return res.status(200).json({ success: true, feedback });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في استرجاع بيانات التقييم',
      code: error.code || 'FEEDBACK_ERROR',
    });
  }
});

/**
 * POST /public/feedback/:token
 * Public submit: saves 1-5 rating, tags, comment. Rejects duplicate submissions with 409.
 */
router.post('/:token', async (req, res) => {
  try {
    const { rating, comment, tags, channel } = req.body || {};
    const feedback = await feedbackService.submitFeedback(req.params.token, {
      rating,
      comment,
      tags,
      channel,
    });

    return res.status(201).json({
      success: true,
      message: 'شكراً لتقييمك! تم تسجيل رأيك بنجاح',
      feedback,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في إرسال التقييم',
      code: error.code || 'FEEDBACK_ERROR',
    });
  }
});

module.exports = router;
