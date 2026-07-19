const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');
const {
  ROUTING_MODES,
  getAssignmentRoutingUserIds,
  normalizeRoutingMode
} = require('./whatsappConversationRoutingService');

class InboxNotificationService {
  /**
   * Create notification for a moderator
   */
  async createNotification(companyId, userId, type, title, body = null, sessionId = null, conversationId = null, data = null) {
    const prisma = getSharedPrismaClient();

    const notification = await prisma.moderatorNotification.create({
      data: {
        companyId,
        userId,
        sessionId,
        conversationId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null
      }
    });

    const io = socketService.getIO();
    if (io) {
      io.to(`user_${userId}`).emit('notification:new', {
        id: notification.id,
        type,
        title,
        body,
        sessionId,
        conversationId,
        data,
        createdAt: notification.createdAt
      });

      io.to(`user_${userId}`).emit('notification:unread', {
        userId,
        increment: true
      });
    }

    return notification;
  }

  /**
   * Notify about new message on assigned number
   */
  async notifyNewMessage(companyId, sessionId, conversationId, customerName, messagePreview) {
    const prisma = getSharedPrismaClient();

    const [assignment, conversation] = await Promise.all([
      prisma.whatsAppNumberAssignment.findFirst({
        where: { sessionId, companyId, isActive: true }
      }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { assignedUserId: true }
      })
    ]);

    if (!assignment) return;

    const routingMode = normalizeRoutingMode(assignment.routingMode);
    let notifyUserIds = [];

    if (
      routingMode === ROUTING_MODES.ROUND_ROBIN &&
      conversation?.assignedUserId
    ) {
      notifyUserIds = [conversation.assignedUserId];
    } else if (assignment.assignedUserId) {
      notifyUserIds = [assignment.assignedUserId];
    } else {
      notifyUserIds = getAssignmentRoutingUserIds(assignment).slice(0, 1);
    }

    for (const userId of notifyUserIds) {
      await this.createNotification(
        companyId,
        userId,
        'new_message',
        `New message from ${customerName}`,
        messagePreview,
        sessionId,
        conversationId
      );
    }
  }

  /**
   * Notify about conversation transfer
   */
  async notifyTransfer(companyId, conversationId, fromUserId, toUserId, transferredByUser) {
    await this.createNotification(
      companyId,
      toUserId,
      'transfer',
      'Conversation transferred to you',
      `Transferred by ${transferredByUser}`,
      null,
      conversationId
    );
  }

  /**
   * Notify about status change
   */
  async notifyStatusChange(companyId, conversationId, userId, newStatus, userName) {
    await this.createNotification(
      companyId,
      userId,
      'status_change',
      `Conversation status changed to ${newStatus}`,
      `Changed by ${userName}`,
      null,
      conversationId
    );
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(companyId, userId, page = 1, limit = 50) {
    const prisma = getSharedPrismaClient();
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.moderatorNotification.findMany({
        where: { companyId, userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.moderatorNotification.count({ where: { companyId, userId } })
    ]);

    const unreadCount = await prisma.moderatorNotification.count({
      where: { companyId, userId, isRead: false }
    });

    return {
      notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const prisma = getSharedPrismaClient();

    const notification = await prisma.moderatorNotification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) return null;

    const updated = await prisma.moderatorNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() }
    });

    const io = socketService.getIO();
    if (io) {
      io.to(`user_${userId}`).emit('notification:read', {
        notificationId,
        userId
      });

      const remaining = await prisma.moderatorNotification.count({
        where: { companyId: notification.companyId, userId, isRead: false }
      });
      io.to(`user_${userId}`).emit('notification:unread', {
        userId,
        count: remaining
      });
    }

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(companyId, userId) {
    const prisma = getSharedPrismaClient();

    const result = await prisma.moderatorNotification.updateMany({
      where: { companyId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    const io = socketService.getIO();
    if (io) {
      io.to(`user_${userId}`).emit('notification:unread', {
        userId,
        count: 0
      });
    }

    return result;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const prisma = getSharedPrismaClient();

    const notification = await prisma.moderatorNotification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) return false;

    await prisma.moderatorNotification.delete({ where: { id: notificationId } });
    return true;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(companyId, userId) {
    const prisma = getSharedPrismaClient();
    return prisma.moderatorNotification.count({
      where: { companyId, userId, isRead: false }
    });
  }
}

module.exports = new InboxNotificationService();
