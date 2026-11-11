const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const instagramController = require('../controller/instagramController');

router.use(verifyToken.authenticateToken);

// instagram_basic
router.get('/instagram/targets', instagramController.getTargets);
router.get('/instagram/media', instagramController.getMedia);
router.get('/instagram/media/:mediaId/insights', instagramController.getMediaInsights);

// instagram_manage_comments
router.get('/instagram/media/:mediaId/comments', instagramController.getComments);
router.post('/instagram/comments/:commentId/reply', instagramController.replyComment);
router.post('/instagram/comments/:commentId/hide', instagramController.hideComment);
router.delete('/instagram/comments/:commentId', instagramController.deleteComment);

// instagram_content_publish
router.post('/instagram/publish/container', instagramController.createContainer);
router.get('/instagram/publish/:containerId/status', instagramController.getContainerStatus);
router.post('/instagram/publish/now', instagramController.publishNow);

module.exports = router;
