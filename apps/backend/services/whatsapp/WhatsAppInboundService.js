/**
 * WhatsApp Inbound Service
 * Shared persistence + notification logic for inbound messages (all providers).
 */

const { getSharedPrismaClient, executeWithRetry } = require('../sharedDatabase');
const WhatsAppSyncService = require('./WhatsAppSyncService');
const { normalizeWhatsAppContactIdentity } = require('./contactIdentity');
const socketService = require('../socketService');
const {
  emitToAudience,
  getConversationAudience
} = require('../whatsappRealtimeAudienceService');
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const aiMessageProcessor = require('../../legacy-ai-agent/aiAgent/aiMessageProcessor');

const getIO = () => socketService.getIO();

const MESSAGE_STATUS_RANK = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3
};

function shouldApplyMessageStatus(currentStatus, nextStatus) {
  if (nextStatus === 'FAILED') {
    return currentStatus !== 'DELIVERED' && currentStatus !== 'READ';
  }

  const currentRank = MESSAGE_STATUS_RANK[currentStatus] ?? 0;
  const nextRank = MESSAGE_STATUS_RANK[nextStatus] ?? 0;

  return nextRank >= currentRank;
}

async function upsertContact(sessionId, remoteJid, options = {}) {
  const { normalizedJid, phoneNumber } = normalizeWhatsAppContactIdentity(remoteJid);
  const isOutgoing = options.isOutgoing === true;
  const pushName = options.pushName || null;
  const customerId = options.customerId || null;

  return await getSharedPrismaClient().whatsAppContact.upsert({
    where: {
      sessionId_jid: {
        sessionId,
        jid: normalizedJid
      }
    },
    update: {
      pushName: pushName || undefined,
      customerId: customerId || undefined,
      lastMessageAt: new Date(),
      totalMessages: { increment: 1 },
      unreadCount: isOutgoing ? undefined : { increment: 1 },
      updatedAt: new Date()
    },
    create: {
      sessionId,
      jid: normalizedJid,
      phoneNumber,
      pushName,
      customerId,
      lastMessageAt: new Date(),
      totalMessages: 1,
      unreadCount: isOutgoing ? 0 : 1,
      isGroup: normalizedJid?.endsWith('@g.us') || false,
      whatsAppSession: {
        connect: { id: sessionId }
      },
      updatedAt: new Date()
    }
  });
}

async function saveIncomingMessage(payload) {
  const {
    sessionId,
    companyId,
    remoteJid,
    messageId,
    messageType,
    content,
    mediaUrl,
    mediaType,
    mediaMimeType,
    mediaFileName,
    quotedMessageId,
    quotedContent,
    interactiveData,
    timestamp,
    metadata,
    pushName
  } = payload;

  const { normalizedJid } = normalizeWhatsAppContactIdentity(remoteJid);

  const savedMessage = await getSharedPrismaClient().whatsAppMessage.upsert({
    where: { messageId },
    update: {
      messageType,
      content,
      mediaUrl,
      mediaType,
      mediaMimeType,
      mediaFileName,
      quotedMessageId,
      quotedContent,
      interactiveData: interactiveData ? JSON.stringify(interactiveData) : undefined,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      updatedAt: new Date()
    },
    create: {
      sessionId,
      remoteJid: normalizedJid,
      messageId,
      fromMe: false,
      messageType,
      content,
      mediaUrl,
      mediaType,
      mediaMimeType,
      mediaFileName,
      quotedMessageId,
      quotedContent,
      interactiveData: interactiveData ? JSON.stringify(interactiveData) : undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'DELIVERED',
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      updatedAt: new Date()
    }
  });

  let syncedCustomer = null;
  let syncedConversation = null;
  try {
    const syncResult = await WhatsAppSyncService.syncMessage(
      companyId,
      sessionId,
      normalizedJid,
      {
        sessionId,
        type: messageType,
        content,
        mediaUrl,
        mediaType,
        mediaMimeType,
        mediaFileName,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        pushName
      },
      true
    );
    syncedCustomer = syncResult?.customer;
    syncedConversation = syncResult?.conversation;
  } catch (error) {
    console.error('❌ Failed to sync inbound message to CRM:', error.message);
  }

  const contact = await upsertContact(sessionId, normalizedJid, {
    isOutgoing: false,
    pushName,
    customerId: syncedCustomer?.id
  });

  const io = getIO();
  const audience = await getConversationAudience({
    companyId,
    sessionId,
    conversationId: syncedConversation?.id || null,
    remoteJid: normalizedJid
  });

  emitToAudience(io, {
    companyId,
    userIds: audience.userIds,
    eventName: 'whatsapp:message:new',
    payload: {
      sessionId,
      message: {
        ...savedMessage,
        remoteJid: normalizedJid
      },
      raw: metadata || null
    }
  });

  try {
    const settings = await executeWithRetry(async () => {
      return await getSharedPrismaClient().whatsAppSettings.findUnique({
        where: { companyId }
      });
    });

    const notificationsEnabled = settings?.browserNotifications !== false;
    const soundEnabled = settings?.notificationSound !== false;

    const contactName = contact?.name || contact?.pushName || normalizedJid.split('@')[0];
    const notificationContent = content
      ? (content.length > 50 ? content.substring(0, 50) + '...' : content)
      : `[${messageType}]`;

    if (notificationsEnabled) {
      try {
        const notifData = JSON.stringify({
          sessionId,
          messageId: savedMessage.id,
          remoteJid: normalizedJid,
          contactId: contact?.id,
          messageType
        });

        await getSharedPrismaClient().notification.create({
          data: {
            companyId,
            userId: null,
            type: 'new_message',
            title: `رسالة جديدة من ${contactName}`,
            message: notificationContent,
            data: notifData
          }
        });
      } catch (e) {
        console.error('❌ Error creating notification:', e.message);
      }
    }

    emitToAudience(io, {
      companyId,
      userIds: audience.userIds,
      eventName: 'whatsapp:notification:new',
      payload: {
        sessionId,
        contactName,
        message: notificationContent,
        messageType,
        timestamp: savedMessage.timestamp,
        soundEnabled,
        notificationsEnabled
      }
    });
  } catch (error) {
    console.error('❌ Error sending WhatsApp notification:', error.message);
  }

  // ── AI auto-reply (fire-and-forget, never blocks the webhook) ──────────────
  if (content && messageType === 'TEXT') {
    setImmediate(async () => {
      try {
        const replyText = await aiMessageProcessor.processMessage({
          companyId,
          sessionId,
          conversationId: syncedConversation?.id || null,
          customerId: syncedCustomer?.id || null,
          remoteJid: normalizedJid,
          content,
        });

        if (replyText) {
          await WhatsAppMessageHandler.sendText(sessionId, normalizedJid, replyText, {
            isAIResponse: true,
          });
        }
      } catch (e) {
        console.error('❌ [AI-AUTOREPLY] Error generating or sending AI reply:', e.message);
      }
    });
  }

  return savedMessage;
}

async function updateMessageStatus(companyId, messageId, status) {
  const prisma = getSharedPrismaClient();
  const existingMessages = await prisma.whatsAppMessage.findMany({
    where: { messageId },
    select: {
      id: true,
      sessionId: true,
      remoteJid: true,
      status: true
    }
  });

  const messagesToUpdate = existingMessages.filter((message) =>
    shouldApplyMessageStatus(message.status, status)
  );

  if (messagesToUpdate.length === 0) {
    return;
  }

  await prisma.whatsAppMessage.updateMany({
    where: {
      id: { in: messagesToUpdate.map((message) => message.id) }
    },
    data: {
      status,
      updatedAt: new Date()
    }
  });

  const io = getIO();
  for (const message of messagesToUpdate) {
    const audience = await getConversationAudience({
      companyId,
      sessionId: message.sessionId,
      remoteJid: message.remoteJid
    });

    emitToAudience(io, {
      companyId,
      userIds: audience.userIds,
      eventName: 'whatsapp:message:status',
      payload: {
        sessionId: message.sessionId,
        messageId,
        remoteJid: message.remoteJid,
        status
      }
    });
  }
}

module.exports = {
  saveIncomingMessage,
  updateMessageStatus,
  __testing: {
    shouldApplyMessageStatus
  }
};
