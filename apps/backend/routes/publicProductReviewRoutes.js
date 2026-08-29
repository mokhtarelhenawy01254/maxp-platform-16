const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const router = express.Router();
const productReviewController = require('../controller/productReviewController');
const backInStockController = require('../controller/backInStockController');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');

const reviewUploadsDir = path.join(__dirname, '..', 'uploads', 'reviews');

if (!fs.existsSync(reviewUploadsDir)) {
  fs.mkdirSync(reviewUploadsDir, { recursive: true });
}

const removeUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (!file?.path) {
      return;
    }

    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Failed to cleanup rejected review upload:', file.path, error.message);
    }
  });
};

const reviewMediaUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, reviewUploadsDir);
    },
    filename(_req, file, cb) {
      const extension = path.extname(file.originalname || '');
      cb(null, `review-${randomUUID()}${extension}`);
    },
  }),
  fileFilter(_req, file, cb) {
    if (file.mimetype?.startsWith('image/') || file.mimetype?.startsWith('video/')) {
      cb(null, true);
      return;
    }

    cb(new Error('Only image and video files are allowed.'));
  },
  limits: {
    fileSize: 40 * 1024 * 1024,
    files: 6,
  },
});

const handleReviewMediaUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    next();
    return;
  }

  reviewMediaUpload.array('media', 6)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    removeUploadedFiles(Array.isArray(req.files) ? req.files : []);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Each review image or video must be 40MB or smaller.',
        });
      }

      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'You can upload up to 6 images or videos per review.',
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: error.message || 'Unable to upload review media.',
    });
  });
};

/**
 * ⭐ Public Routes للتقييمات والمراجعات
 * Mounted at /api/v1/public in server.js
 *
 * ⚠️ ملاحظة: الـ middlewares هنا مطبّقة على مستوى الـ routes وليس
 * router.use — لأن الـ router متركّب على /api/v1/public بالكامل،
 * وأي router.use(requireCompany) هنا كان بيمنع كل مسارات /api/v1/public/*
 * التانية المركّبة بعده (زي affiliates و platform) لو الشركة مش متحددة.
 */

const withCompanyContext = [extractSubdomainMiddleware, requireCompany];

// Get product reviews (Public)
router.get(
  '/products/:productId/reviews',
  ...withCompanyContext,
  productReviewController.getProductReviews,
);

// Create review (Public)
router.post(
  '/products/:productId/reviews',
  ...withCompanyContext,
  handleReviewMediaUpload,
  productReviewController.createReview,
);

// Subscribe to back in stock alerts (Public)
router.post(
  '/products/:productId/back-in-stock',
  ...withCompanyContext,
  backInStockController.subscribe,
);

// Mark review as helpful (Public)
router.put(
  '/reviews/:reviewId/helpful',
  ...withCompanyContext,
  productReviewController.markHelpful,
);


module.exports = router;
