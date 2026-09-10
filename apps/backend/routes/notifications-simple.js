const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { authenticateToken } = require('../utils/verifyToken');

// ✅ FIX: Don't create prisma instance at module load time
// Always use getPrisma() inside async functions
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Get recent notifications (System notifications)
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const limit = parseInt(req.query.limit) || 20; // 🚀 تقليل العدد من 50 إلى 20
    const type = req.query.type; // فلترة حسب النوع (اختياري)

    // Allow SUPER_ADMIN to bypass companyId check for global system notifications
    if (!companyId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    console.log('📋 [NOTIFICATIONS-API] Fetching notifications for user:', userId, 'company:', companyId || 'ALL (Super Admin)');

    // بناء الـ where clause
    const whereClause = {
      ...(companyId && { companyId }),
      OR: [
        { userId: null } // إشعارات عامة للشركة
      ]
    };

    // إضافة userId فقط لو موجود
    if (userId) {
      whereClause.OR.push({ userId: userId });
    }

    // فلترة حسب النوع إذا تم تحديده
    if (type) {
      whereClause.type = type;
    }

    console.log('📋 [NOTIFICATIONS-API] Where clause:', JSON.stringify(whereClause, null, 2));

    // 🚀 جلب الإشعارات والعدد في query واحد بدل اتنين
    const [notifications, unreadCount] = await Promise.all([
      safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.notification.findMany({
          where: whereClause,
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            data: true,
            isRead: true,
            createdAt: true,
            userId: true,
            // 🚀 بدل include، نستخدم select للـ user (أسرع)
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
      }),
      safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.notification.count({
          where: {
            ...whereClause,
            isRead: false
          }
        });
      })
    ]);

    // تحويل data من JSON string إلى object (إذا كان string)
    const formattedNotifications = notifications.map(notif => {
      let parsedData = null;
      if (notif.data) {
        try {
          parsedData = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        } catch (e) {
          parsedData = notif.data;
        }
      }
      return {
        ...notif,
        timestamp: notif.createdAt,
        data: parsedData
      };
    });

    console.log(`📋 [NOTIFICATIONS-API] Found ${notifications.length} notifications, ${unreadCount} unread`);
    if (notifications.length > 0) {
      console.log('📋 [NOTIFICATIONS-API] First notification:', JSON.stringify(notifications[0], null, 2));
    }

    res.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error:', error);
    res.json({
      success: true,
      notifications: [],
      unreadCount: 0
    });
  }
});

/**
 * Mark notification as read
 */
router.post('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId, companyId } = req.user;

    //console.log(`✅ [NOTIFICATIONS-API] Mark as read request for notification: ${notificationId}`);

    const updatedNotification = // SECURITY WARNING: Ensure companyId filter is included
      await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.notification.updateMany({
          where: {
            id: notificationId,
            companyId: companyId,
            OR: [
              { userId: userId },
              { userId: null }
            ]
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
      });

    if (updatedNotification.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    //console.log(`✅ [NOTIFICATIONS-API] Notification marked as read: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * Delete notification
 */
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId, companyId } = req.user;

    //console.log(`🗑️ [NOTIFICATIONS-API] Delete request for notification: ${notificationId}`);

    const deletedNotification = // SECURITY WARNING: Ensure companyId filter is included
      await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.notification.deleteMany({
          where: {
            id: notificationId,
            companyId: companyId,
            OR: [
              { userId: userId },
              { userId: null }
            ]
          }
        });
      });

    if (deletedNotification.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    //console.log(`🗑️ [NOTIFICATIONS-API] Notification deleted: ${notificationId}`);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    //console.log(`✅ [NOTIFICATIONS-API] Mark all as read for user: ${userId}`);

    // SECURITY WARNING: Ensure companyId filter is included
    await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.notification.updateMany({
        where: {
          companyId: companyId,
          OR: [
            { userId: userId },
            { userId: null }
          ],
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS-API] Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

module.exports = router;
