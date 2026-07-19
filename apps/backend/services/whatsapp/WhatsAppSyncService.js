const { getSharedPrismaClient } = require('../sharedDatabase');
const inboxNotificationService = require('../inboxNotificationService');
const { getNormalizedSettings } = require('../whatsappInboxSettingsService');
const {
  CLOSED_CHAT_STATUSES,
  buildConversationMetadata,
  getSessionIdFromMetadata,
} = require('../whatsappInboxMetadata');
const {
  resolveConversationAssignee
} = require('../whatsappConversationRoutingService');
const whatsappAssignmentEngineService = require('../whatsappAssignmentEngineService');

const escapeMetadataValue = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

const buildSessionMetadataWhere = (sessionId) => ({
  OR: [
    { metadata: { contains: `"sessionId":"${sessionId}"` } },
    { metadata: { contains: `"whatsappSessionId":"${sessionId}"` } },
    { metadata: { contains: `sessionId:${sessionId}` } },
    { metadata: { contains: `whatsappSessionId:${sessionId}` } }
  ]
});

const WhatsAppSyncService = {
  async findOrCreateCustomer(companyId, phoneNumber, pushName, profilePicUrl) {
    const prisma = getSharedPrismaClient();
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');

    let customer = await prisma.customer.findFirst({
      where: {
        companyId,
        OR: [
          { phone: cleanPhone },
          { whatsappId: cleanPhone }
        ]
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId,
          firstName: pushName || 'WhatsApp User',
          lastName: '',
          phone: cleanPhone,
          whatsappId: cleanPhone,
          avatar: profilePicUrl,
          status: 'LEAD'
        }
      });
    } else if (profilePicUrl && !customer.avatar) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { avatar: profilePicUrl }
      });
    }

    return customer;
  },

  async findOrCreateConversation(companyId, customerId, options = {}) {
    const prisma = getSharedPrismaClient();
    const settings = await getNormalizedSettings(companyId, prisma);
    const sessionId = options.sessionId || null;
    const remoteJid = options.remoteJid || null;

    const conversationWhere = {
      companyId,
      customerId,
      channel: 'WHATSAPP',
      status: { notIn: CLOSED_CHAT_STATUSES }
    };

    if (sessionId && remoteJid) {
      conversationWhere.AND = [
        buildSessionMetadataWhere(sessionId),
        { metadata: { contains: `"remoteJid":"${escapeMetadataValue(remoteJid)}"` } }
      ];
    } else if (sessionId) {
      conversationWhere.AND = [buildSessionMetadataWhere(sessionId)];
    }

    let conversation = await prisma.conversation.findFirst({
      where: conversationWhere,
      orderBy: { updatedAt: 'desc' }
    });

    if (!conversation) {
      const nextStatus = settings.defaultChatStatus || 'NEW';
      const queueKey = 'WAITING_QUEUE';

      conversation = await prisma.conversation.create({
        data: {
          companyId,
          customerId,
          channel: 'WHATSAPP',
          status: nextStatus,
          subject: options.subject || 'WhatsApp Conversation',
          assignedUserId: null,
          lastMessageAt: new Date(),
          unreadCount: 0,
          metadata: buildConversationMetadata(null, {
            whatsappSessionId: sessionId,
            sessionId,
            remoteJid,
            inboxRouting: {
              sessionId,
              queueKey,
              assignmentStrategy: null
            },
            ownership: {
              sessionId,
              currentOwnerId: null,
              lockActive: false,
              lockedAt: null
            }
          })
        }
      });
    } else {
      const metadataPatch = {};
      const currentSessionId = getSessionIdFromMetadata(conversation.metadata);

      if (sessionId && currentSessionId !== sessionId) {
        metadataPatch.whatsappSessionId = sessionId;
        metadataPatch.sessionId = sessionId;
      }

      if (remoteJid) {
        metadataPatch.remoteJid = remoteJid;
      }

      if (Object.keys(metadataPatch).length > 0) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            metadata: buildConversationMetadata(conversation.metadata, metadataPatch)
          }
        });
      }
    }

    return conversation;
  },

  async syncMessage(companyId, sessionId, remoteJid, messageData, isIncoming) {
    try {
      const prisma = getSharedPrismaClient();

      if (String(remoteJid || '').includes('@lid')) {
        console.warn(`⚠️ Skipping CRM sync for unresolved WhatsApp LID: ${remoteJid}`);
        return null;
      }

      if (String(remoteJid || '').endsWith('@newsletter')) {
        console.log(`📢 Skipping CRM sync for WhatsApp newsletter/channel: ${remoteJid}`);
        return null;
      }

      const phoneNumber = remoteJid.split('@')[0].replace(/\D/g, '');
      const customer = await this.findOrCreateCustomer(
        companyId,
        phoneNumber,
        messageData.pushName,
        messageData.profilePicUrl
      );

      const conversation = await this.findOrCreateConversation(companyId, customer.id, {
        sessionId,
        remoteJid
      });

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          type: this.mapMessageType(messageData.type),
          content: messageData.content || '',
          attachments: messageData.mediaUrl ? JSON.stringify({
            url: messageData.mediaUrl,
            type: messageData.mediaType,
            mime: messageData.mediaMimeType,
            name: messageData.mediaFileName
          }) : null,
          metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : null,
          isFromCustomer: isIncoming,
          senderId: isIncoming ? null : (messageData.senderId || null),
          createdAt: messageData.timestamp || new Date(),
          isRead: !isIncoming
        }
      });

      let activeConversation = conversation;
      if (isIncoming && sessionId && !conversation.assignedUserId) {
        try {
          const result = await whatsappAssignmentEngineService.assignConversationToBestModerator({
            companyId,
            conversationId: conversation.id,
            sessionId,
            force: false,
            reason: 'inbound_message'
          });
          activeConversation = result.conversation;
        } catch (assignError) {
          console.error('❌ [WhatsAppSyncService] Auto assignment failed:', assignError.message);
        }
      }

      const nextAssignedUserId = activeConversation.assignedUserId || null;
      const nextStatus = isIncoming
        ? (nextAssignedUserId ? 'ASSIGNED' : activeConversation.status || 'NEW')
        : 'ACTIVE';

      const metadata = buildConversationMetadata(activeConversation.metadata, {
        whatsappSessionId: sessionId,
        sessionId,
        remoteJid,
        inboxRouting: {
          sessionId,
          queueKey: isIncoming
            ? (nextAssignedUserId ? 'ASSIGNED_QUEUE' : 'WAITING_QUEUE')
            : 'ASSIGNED_QUEUE'
        },
        ownership: {
          sessionId,
          currentOwnerId: nextAssignedUserId,
          lockActive: Boolean(nextAssignedUserId),
          lockedAt: nextAssignedUserId ? new Date().toISOString() : null
        }
      });

      const updatedConversation = await prisma.conversation.update({
        where: { id: activeConversation.id },
        data: {
          assignedUserId: nextAssignedUserId,
          status: nextStatus,
          lastMessageAt: messageData.timestamp || new Date(),
          lastMessagePreview: this.truncatePreview(messageData.content, messageData.type),
          unreadCount: isIncoming ? { increment: 1 } : undefined,
          isRead: !isIncoming,
          lastMessageIsFromCustomer: isIncoming,
          metadata
        }
      });

      if (isIncoming && sessionId) {
        const customerName =
          [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
          customer.phone ||
          phoneNumber;

        await inboxNotificationService.notifyNewMessage(
          companyId,
          sessionId,
          updatedConversation.id,
          customerName,
          this.truncatePreview(messageData.content, messageData.type)
        );
      }

      return { customer, conversation: updatedConversation, message };
    } catch (error) {
      console.error('❌ Error syncing to central DB:', error);
      return null;
    }
  },

  mapMessageType(whatsAppType) {
    const typeMap = {
      text: 'TEXT',
      image: 'IMAGE',
      video: 'VIDEO',
      audio: 'AUDIO',
      voice: 'AUDIO',
      document: 'DOCUMENT',
      location: 'LOCATION',
      sticker: 'IMAGE',
      template: 'TEMPLATE',
      interactive: 'INTERACTIVE'
    };
    return typeMap[String(whatsAppType || '').toLowerCase()] || 'TEXT';
  },

  truncatePreview(content, type) {
    if (!content && type !== 'text') return `[${String(type || 'message').toUpperCase()}]`;
    return content && content.length > 80 ? `${content.substring(0, 80)}...` : content;
  }
};

module.exports = WhatsAppSyncService;
