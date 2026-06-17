const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require("../utils/verifyToken");

// All Facebook status routes require super admin access
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireSuperAdmin);

// فحص حالة صفحات Facebook
router.get('/facebook-status', async (req, res) => {
  try {
    console.log('🔍 Checking Facebook pages status...');

    // البحث عن جميع صفحات Facebook
    const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true,
        companyId: true,
        company: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    console.log(`📊 Found ${facebookPages.length} Facebook pages`);

    // فحص حالة كل صفحة
    const pagesWithStatus = facebookPages.map(page => ({
      id: page.id,
      pageId: page.pageId,
      pageName: page.pageName,
      status: page.status,
      connectedAt: page.connectedAt,
      companyName: page.company?.name || 'Unknown',
      companyId: page.companyId,
      isActive: page.status === 'connected',
      daysSinceConnection: page.connectedAt ?
        Math.floor((new Date() - new Date(page.connectedAt)) / (1000 * 60 * 60 * 24)) : null
    }));

    res.json({
      success: true,
      data: {
        totalPages: facebookPages.length,
        activePages: pagesWithStatus.filter(p => p.isActive).length,
        inactivePages: pagesWithStatus.filter(p => !p.isActive).length,
        pages: pagesWithStatus
      },
      message: 'Facebook pages status retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error checking Facebook status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// اختبار إرسال رسالة تجريبية
router.post('/test-message', async (req, res) => {
  try {
    const {
      recipientId,
      message,
      messageType = 'TEXT',
      imageUrl,
      mediaUrl,
    } = req.body;
    let { pageId } = req.body;

    const normalizedType = String(messageType || 'TEXT').toUpperCase();
    if (!['TEXT', 'IMAGE'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: 'messageType must be TEXT or IMAGE'
      });
    }

    const hasMediaUrl = Boolean(imageUrl || mediaUrl);
    const resolvedMessageType = hasMediaUrl || normalizedType === 'IMAGE' ? 'IMAGE' : 'TEXT';
    const messageContent = resolvedMessageType === 'IMAGE'
      ? imageUrl || mediaUrl || message
      : message;

    if (!recipientId || !messageContent) {
      return res.status(400).json({
        success: false,
        error: resolvedMessageType === 'IMAGE'
          ? 'Recipient ID and image URL are required'
          : 'Recipient ID and message are required'
      });
    }

    console.log(`🧪 Testing ${resolvedMessageType} send to ${recipientId}`);

    const { sendFacebookMessage } = require('../utils/allFunctions');

    // البحث عن الصفحة إذا تم تحديد pageId
    let pageAccessToken = null;
    if (pageId) {
      const { getPageToken } = require('../utils/allFunctions');
      const pageData = await getPageToken(pageId);
      if (pageData && pageData.pageAccessToken) {
        pageAccessToken = pageData.pageAccessToken;
      }
    }

    // إذا لم نجد رمز الوصول للصفحة، نحاول العثور على صفحة متصلة
    if (!pageAccessToken) {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
      const defaultPage = await getSharedPrismaClient().facebookPage.findFirst({
        where: { status: 'connected' },
        orderBy: { connectedAt: 'desc' }
      });

      if (defaultPage && defaultPage.pageAccessToken) {
        pageAccessToken = defaultPage.pageAccessToken;
        pageId = defaultPage.pageId; // تحديث pageId للاستخدام
      }
    }

    // التحقق من توفر رمز الوصول
    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'No valid Facebook page found'
      });
    }

    const result = await sendFacebookMessage(
      recipientId,
      messageContent,
      resolvedMessageType,
      pageId
    );

    res.json({
      success: result.success,
      data: {
        ...result,
        messageType: resolvedMessageType,
      },
      message: result.success ? 'Test message sent successfully' : 'Test message failed'
    });

  } catch (error) {
    console.error('❌ Error testing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

