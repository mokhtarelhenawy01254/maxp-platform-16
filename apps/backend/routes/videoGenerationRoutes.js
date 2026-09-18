const express = require('express');
const router = express.Router();
const videoGenerationController = require('../controller/videoGenerationController');
const { authenticateToken } = require('../utils/verifyToken');

// Public/optional auth wrapper if needed, but here we authenticate if token is present
const optionalOrRequiredAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authenticateToken(req, res, next);
  }
  // Allow internal or agent callers that might pass company-id header
  if (req.headers['x-company-id']) {
    req.companyId = req.headers['x-company-id'];
  }
  next();
};

router.post('/generate', optionalOrRequiredAuth, (req, res) => videoGenerationController.generateVideo(req, res));
router.get('/status/:taskId', optionalOrRequiredAuth, (req, res) => videoGenerationController.getVideoStatus(req, res));
router.get('/history', optionalOrRequiredAuth, (req, res) => videoGenerationController.getHistory(req, res));

module.exports = router;
