const express = require('express');
const router = express.Router();
const conversationController = require('../controller/conversationController');
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const verifyToken = require("../utils/verifyToken")

const conversationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/conversations');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const conversationUpload = multer({ storage: conversationStorage });

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const mediaUpload = multer({ storage: mediaStorage });

// ... (skip down)

// 🆕 Bulk Update Route (MUST be before /:id routes)
console.log('✅ [DEBUG-ROUTE] Defining routes...');
// 🆕 Bulk Update Route (MUST be before /:id routes)
console.log('✅ [DEBUG-ROUTE] Defining routes...');
// router.put('/bulk-update', verifyToken.authenticateToken, conversationController.bulkUpdateConversations);

// 🆕 Statistics Route (MUST be before /:id routes)
const { createEndpointRateLimiter } = require('../middleware/rateLimiter');
// router.get('/stats/daily', verifyToken.authenticateToken, conversationController.getConversationStats);
router.get('/stats/sent-messages', createEndpointRateLimiter('STATS'), verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.getSentMessagesStats);
router.get('/stats/historical-prediction-data', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.getHistoricalPredictionData);

// Posts routes (must be before /:id routes to avoid conflicts)
router.get('/posts/:postId/details', verifyToken.authenticateToken, conversationController.getPostDetails);
router.put('/posts/:postId/featured-product', verifyToken.authenticateToken, conversationController.updatePostFeaturedProduct);

// Dynamic /:id routes (MUST come AFTER static routes)
router.delete('/:id', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.deleteConverstation);
router.post('/:id/messages', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.postMessageConverstation);
router.post('/:id/upload', verifyToken.authenticateToken, conversationUpload.array('files', 10), conversationController.uploadFile);
router.post('/:id/send-existing-image', verifyToken.authenticateToken, conversationController.sendExistingImage);
router.post('/:id/reply', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.postReply);
router.get('/:id/health-check', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.checkHealth);
router.post('/:id/read', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.markConversationAsRead);
router.put('/:id/mark-unread', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.markConversationAsUnread);

// Conversation routes
router.get('/:id/post-details', verifyToken.authenticateToken, conversationController.getConversationPostDetails); // Get post details (lazy loading)

// New GET routes
router.get('/', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.getConversations);
router.get('/:id', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.getConversation);
router.put('/:id', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.updateConversation);
router.get('/:id/messages', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.getMessages);

// 🆕 Media and message management routes
router.post('/:id/messages/media', verifyToken.authenticateToken, mediaUpload.single('file'), conversationController.sendMediaMessage);
router.put('/:id/messages/:messageId', verifyToken.authenticateToken, conversationController.editMessage);
router.put('/:id/messages/:messageId/star', verifyToken.authenticateToken, conversationController.toggleMessageStar);
router.put('/:id/messages/:messageId/reaction', verifyToken.authenticateToken, conversationController.toggleMessageReaction);
// Snooze conversation
router.post('/:id/snooze', verifyToken.authenticateToken, conversationController.snoozeConversation);
router.delete('/:id/messages/:messageId', verifyToken.authenticateToken, conversationController.deleteMessage);
router.post('/:id/messages/location', verifyToken.authenticateToken, conversationController.sendLocationMessage);

// 🆕 Sync Facebook Messages Route
router.post('/:id/sync-messages', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, conversationController.syncFacebookMessages);

console.log('✅ [DEBUG-ROUTE] All routes defined in conversationRoutes');
const exportedRouter = router;
console.log('✅ [DEBUG-ROUTE] Exporting router...');
module.exports = exportedRouter;
console.log('✅ [DEBUG-ROUTE] Exported router');
