const express = require("express");
const router = express.Router();
const commentController = require("../controller/commentController");
const verifyToken = require("../utils/verifyToken");
const aiServiceAdminClient = require("../services/aiServiceAdminClient");

// Get all comments with filtering and pagination
router.use((req, res, next) => {
  console.log(`📡 [COMMENT-ROUTES] Request: ${req.method} ${req.path}`);
  next();
});

// Get comment statistics
router.get(
  "/facebook-comments/stats",
  verifyToken.authenticateToken,
  commentController.getCommentStats,
);

// Get all comments with filtering and pagination
router.get(
  "/facebook-comments",
  verifyToken.authenticateToken,
  commentController.getFacebookComments,
);

// Get a specific comment by ID
router.get(
  "/facebook-comments/:id",
  verifyToken.authenticateToken,
  commentController.getFacebookCommentById,
);

// Update comment response
router.put(
  "/facebook-comments/:id",
  verifyToken.authenticateToken,
  commentController.updateFacebookComment,
);

// Dedicated endpoint for sending manual responses to Facebook
router.post(
  "/facebook-comments/:id/send-response",
  verifyToken.authenticateToken,
  commentController.sendManualResponseToFacebook,
);

// Delete a comment
router.delete(
  "/facebook-comments/:id",
  verifyToken.authenticateToken,
  commentController.deleteFacebookComment,
);

// Bulk delete comments
router.delete(
  "/facebook-comments",
  verifyToken.authenticateToken,
  commentController.bulkDeleteFacebookComments,
);

// NEW: Get all Facebook posts (comments grouped by postId)
router.get(
  "/facebook-posts",
  verifyToken.authenticateToken,
  commentController.getFacebookPosts,
);

// NEW: Get comments for a specific post
router.get(
  "/facebook-posts/:postId/comments",
  verifyToken.authenticateToken,
  commentController.getCommentsByPostId,
);

// NEW: Set response method for a post
router.post(
  "/facebook-posts/:postId/response-method",
  verifyToken.authenticateToken,
  commentController.setPostResponseMethod,
);

// NEW: Get response method for a post
router.get(
  "/facebook-posts/:postId/response-method",
  verifyToken.authenticateToken,
  commentController.getPostResponseMethod,
);

// NEW: Apply response method to all pending comments of a post
router.post(
  "/facebook-posts/:postId/apply-response-method",
  verifyToken.authenticateToken,
  commentController.applyPostResponseMethod,
);

// NEW: Page-level routes
router.get(
  "/facebook-pages",
  verifyToken.authenticateToken,
  commentController.getFacebookPages,
);
router.get(
  "/facebook-pages/:pageId/posts",
  verifyToken.authenticateToken,
  commentController.getPostsByPageId,
);
router.post(
  "/facebook-pages/:pageId/response-method",
  verifyToken.authenticateToken,
  commentController.setPageResponseMethod,
);
router.get(
  "/facebook-pages/:pageId/response-method",
  verifyToken.authenticateToken,
  commentController.getPageResponseMethod,
);

// NEW: Automated Filter Settings — proxied to Python ai-service
router.get(
  "/filter-settings/global",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const companyId = user?.companyId;
      if (!companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const data = await aiServiceAdminClient.getGlobalFilterSettings(companyId);
      return res.json({ success: true, ...data });
    } catch (error) {
      console.error('❌ [FILTER-SETTINGS] Error fetching global settings:', error);
      res.status(502).json({ success: false, error: error.message });
    }
  },
);
router.put(
  "/filter-settings/global",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const companyId = user?.companyId;
      if (!companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      await aiServiceAdminClient.updateGlobalFilterSettings(companyId, req.body);
      return res.json({ success: true });
    } catch (error) {
      console.error('❌ [FILTER-SETTINGS] Error updating global settings:', error);
      res.status(502).json({ success: false, error: error.message });
    }
  },
);
router.get(
  "/filter-settings/page/:pageId",
  verifyToken.authenticateToken,
  commentController.getPageFilterSettings,
);
router.put(
  "/filter-settings/page/:pageId",
  verifyToken.authenticateToken,
  commentController.updatePageFilterSettings,
);
router.post(
  "/filter-settings/transfer",
  verifyToken.authenticateToken,
  commentController.transferPageSettings,
);

module.exports = router;
