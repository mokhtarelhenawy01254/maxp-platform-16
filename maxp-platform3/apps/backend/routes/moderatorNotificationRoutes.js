const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const notificationController = require('../controller/inboxNotificationController');

router.use(verifyToken.authenticateToken);

router.get(
  '/',
  requireDbPermission('notifications.view'),
  notificationController.getNotifications
);

router.get(
  '/unread-count',
  requireDbPermission('notifications.view'),
  notificationController.getUnreadCount
);

router.post(
  '/:id/read',
  requireDbPermission('notifications.view'),
  notificationController.markAsRead
);

router.post(
  '/read-all',
  requireDbPermission('notifications.view'),
  notificationController.markAllAsRead
);

router.delete(
  '/:id',
  requireDbPermission('notifications.view'),
  notificationController.deleteNotification
);

module.exports = router;
