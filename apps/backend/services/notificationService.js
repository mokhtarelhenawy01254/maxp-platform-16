const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Universal Notification Service for MaxP Platform
 * Provides unified creation of notifications across modules (e.g. Academy, Orders, System)
 */
async function createNotification({
  companyId,
  title,
  body,
  message,
  type = 'SYSTEM',
  userId = null,
  recipientCustomerId = null,
  metadata = null,
}) {
  if (!companyId) return null;
  const db = getSharedPrismaClient();
  const notificationMessage = body || message || title;

  try {
    const notification = await db.notification.create({
      data: {
        companyId,
        title,
        message: notificationMessage,
        type,
        data: metadata ? metadata : (recipientCustomerId ? { recipientCustomerId } : null),
        userId: userId || null,
      },
    });

    try {
      const socketService = require('./socketService');
      if (socketService?.emitToCompany) {
        socketService.emitToCompany(companyId, 'notification:new', notification);
      }
      if (userId && socketService?.emitToUser) {
        socketService.emitToUser(userId, 'notification:new', notification);
      }
    } catch (_) {}

    return notification;
  } catch (err) {
    console.warn('[notificationService] Failed to create notification:', err.message);
    return null;
  }
}

module.exports = {
  createNotification,
};
