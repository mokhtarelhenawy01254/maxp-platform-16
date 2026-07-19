const inboxNotificationService = require('../services/inboxNotificationService');

/**
 * @route GET /api/v1/notifications
 * @desc Get notifications for the current user
 */
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await inboxNotificationService.getUserNotifications(
      req.user.companyId,
      req.user.id,
      page,
      limit
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[NotificationController] getNotifications error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await inboxNotificationService.getUnreadCount(
      req.user.companyId,
      req.user.id
    );
    res.json({ success: true, count });
  } catch (error) {
    console.error('[NotificationController] getUnreadCount error:', error.message);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * @route POST /api/v1/notifications/:id/read
 * @desc Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await inboxNotificationService.markAsRead(
      req.params.id,
      req.user.id
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    console.error('[NotificationController] markAsRead error:', error.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * @route POST /api/v1/notifications/read-all
 * @desc Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await inboxNotificationService.markAllAsRead(
      req.user.companyId,
      req.user.id
    );
    res.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('[NotificationController] markAllAsRead error:', error.message);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await inboxNotificationService.deleteNotification(
      req.params.id,
      req.user.id
    );
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('[NotificationController] deleteNotification error:', error.message);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
