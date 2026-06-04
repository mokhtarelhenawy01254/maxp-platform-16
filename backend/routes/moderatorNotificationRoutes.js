const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const notificationController = require('../controller/inboxNotificationController');

router.use(requireAuth);

router.get(
  '/',
  requirePermission('notifications.view'),
  notificationController.getNotifications
);

router.get(
  '/unread-count',
  requirePermission('notifications.view'),
  notificationController.getUnreadCount
);

router.post(
  '/:id/read',
  requirePermission('notifications.view'),
  notificationController.markAsRead
);

router.post(
  '/read-all',
  requirePermission('notifications.view'),
  notificationController.markAllAsRead
);

router.delete(
  '/:id',
  requirePermission('notifications.view'),
  notificationController.deleteNotification
);

module.exports = router;
