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
const aiSdkClient = require('../aiSdkClient');
const { getEffectiveAiAutoReplySetting } = require('../aiSettingsResolver');

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

  const updatePayload = {
    pushName: pushName || undefined,
    lastMessageAt: new Date(),
    lastCustomerMessageAt: isOutgoing ? undefined : new Date(),
    totalMessages: { increment: 1 },
    unreadCount: isOutgoing ? undefined : { increment: 1 },
    updatedAt: new Date()
  };
  if (customerId) {
    updatePayload.customer = { connect: { id: customerId } };
  }

  const createPayload = {
    jid: normalizedJid,
    phoneNumber,
    pushName,
    lastMessageAt: new Date(),
    lastCustomerMessageAt: isOutgoing ? undefined : new Date(),
    totalMessages: 1,
    unreadCount: isOutgoing ? 0 : 1,
    isGroup: normalizedJid?.endsWith('@g.us') || false,
    isNewsletter: normalizedJid?.endsWith('@newsletter') || false,
    whatsAppSession: {
      connect: { id: sessionId }
    },
    updatedAt: new Date()
  };
  if (customerId) {
    createPayload.customer = { connect: { id: customerId } };
  }

  return await getSharedPrismaClient().whatsAppContact.upsert({
    where: {
      sessionId_jid: {
        sessionId,
        jid: normalizedJid
      }
    },
    update: updatePayload,
    create: createPayload
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

  // ── AI auto-reply with debounce ────────────────────────────────────────────
  if (content && messageType === 'TEXT' && syncedCustomer?.companyId) {
    setImmediate(async () => {
      try {
        const { getSharedPrismaClient } = require('../sharedDatabase');
        const prisma = getSharedPrismaClient();
        const aiSetting = await getEffectiveAiAutoReplySetting(syncedCustomer.companyId, prisma);
        if (!aiSetting?.autoReplyEnabled) {
          console.log('🟡 [WA-DEBOUNCE] AI auto-reply disabled for company');
          return;
        }
        if (aiSetting.workingHoursEnabled && aiSetting.workingHours) {
          try {
            const hours = JSON.parse(typeof aiSetting.workingHours === 'string' ? aiSetting.workingHours : '{}');
            const now = new Date();
            const dayName = now.toLocaleString('en', { weekday: 'long', timeZone: 'Africa/Cairo' }).toLowerCase();
            const today = hours[dayName];
            if (today && !today.enabled) { console.log('🟡 [WA-DEBOUNCE] Outside working hours (day disabled)'); return; }
            if (today && today.start && today.end) {
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const [startH, startM] = today.start.split(':').map(Number);
              const [endH, endM] = today.end.split(':').map(Number);
              const startMin = startH * 60 + startM;
              const endMin = endH * 60 + endM;
              if (currentMinutes < startMin || currentMinutes > endMin) { console.log('🟡 [WA-DEBOUNCE] Outside working hours (time)'); return; }
            }
          } catch(e) { /* continue if parsing fails */ }
        }

        const { accumulateWA } = require('../facebookDebounceService');

        accumulateWA(syncedCustomer.companyId, sessionId, normalizedJid, {
          message: content,
          customerId: syncedCustomer.id,
          customerPhone: syncedCustomer?.phone || normalizedJid.split('@')[0],
          conversationId: syncedConversation?.id,
          companyId: syncedCustomer.companyId,
          sessionId,
          normalizedJid,
        }, async (entries) => {
          if (entries.length === 0) return;

          const combinedMessage = entries.map(e => e.message).join('\n---\n');
          const first = entries[0];

          console.log(`🟢 [WA-DEBOUNCE] Processing ${entries.length} debounced message(s) as one request`);

          // ponytail: admin routing — match sender phone against company admin users
          let channel = 'WHATSAPP';
          try {
            const senderPhone = (first.customerPhone || first.normalizedJid.split('@')[0]).replace(/\D/g, '');
            const adminUsers = await prisma.user.findMany({
              where: { companyId: first.companyId, role: { in: ['OWNER', 'COMPANY_ADMIN', 'MANAGER'] }, phone: { not: null } },
              select: { phone: true },
              take: 20,
            });
            const adminPhones = adminUsers.map(u => {
              const p = u.phone.replace(/\D/g, '');
              return p.startsWith('0') ? '20' + p.slice(1) : p;
            }).filter(Boolean);
            if (adminPhones.includes(senderPhone)) {
              channel = 'WHATSAPP_ADMIN';
              console.log(`🔵 [WA-DEBOUNCE] Sender ${senderPhone} is admin → routing to WHATSAPP_ADMIN`);
            } else {
              console.log(`⚪ [WA-DEBOUNCE] Sender ${senderPhone} not in admin users → WHATSAPP`);
            }
          } catch (e) {
            console.warn('⚠️ [WA-DEBOUNCE] Admin channel resolution failed, defaulting to WHATSAPP:', e.message);
          }

          const result = await aiSdkClient.sendChatMessage({
            companyId: first.companyId,
            customerId: first.customerId,
            message: combinedMessage,
            threadId: first.conversationId,
            channel,
            memoryContext: null,
          });

          // Silent Escalation
          if (result && (result.status === 'escalated' || (result.escalation && !result.reply))) {
            const { flagThreadForHumanTakeover } = require('../silentEscalationService');
            await flagThreadForHumanTakeover({
              companyId: first.companyId,
              conversationId: first.conversationId,
              customerPhone: first.normalizedJid,
              customerId: first.customerId,
              reason: result.escalation?.reason || 'ai_failure',
              customerMessage: combinedMessage,
              channel: 'WHATSAPP',
            });
            return;
          }

          const replyText = result.reply;
          if (replyText) {
            await WhatsAppMessageHandler.sendText(first.sessionId, first.normalizedJid, replyText, {
              isAIResponse: true,
            });
            // Save AI reply to public.messages for conversation continuity
            if (first.conversationId) {
              getSharedPrismaClient().message.create({
                data: {
                  conversationId: first.conversationId,
                  content: replyText,
                  type: 'TEXT',
                  isFromCustomer: false,
                  metadata: JSON.stringify({ platform: 'whatsapp', source: 'ai_reply' }),
                },
              }).catch(e => console.error('[WA-AI] Failed to save AI reply to DB:', e.message));
            }
          }
          const attachments = result.response_attachments || result.responseAttachments;
          console.log(`[WA-AI-ATTACHMENTS] received ${attachments?.length || 0} attachment(s)`);
          if (Array.isArray(attachments)) {
            for (const att of attachments) {
              if (att.type === 'image' && att.url && !att.url.startsWith('data:')) {
                console.log(`[WA-AI-ATTACHMENT] sending image: ${att.url.substring(0, 80)}...`);
                try {
                  await WhatsAppMessageHandler.sendImage(first.sessionId, first.normalizedJid, { url: att.url }, '', { isAIResponse: true });
                  console.log('[WA-AI-ATTACHMENT] image sent successfully');
                } catch (e) {
                  console.error('[WA-AI-ATTACHMENT] Failed to send image:', e.message);
                }
              } else {
                console.log(`[WA-AI-ATTACHMENT] skipping attachment type=${att.type} url=${(att.url || '').substring(0, 40)}...`);
              }
            }
          }
        });
      } catch (e) {
        console.error('❌ [WA-DEBOUNCE] Error generating or sending AI reply:', e.message);
      }
    });
  }

  // ── Lead Follow-up: enroll on first message if customer is LEAD ──────────
  if (syncedCustomer && syncedCustomer.status === 'LEAD') {
    setImmediate(async () => {
      try {
        const prisma = getSharedPrismaClient();
        const existingEnrollment = await prisma.leadFollowUpEnrollment.findFirst({
          where: { whatsappContactId: contact.id, status: 'ACTIVE' }
        });
        if (!existingEnrollment) {
          const LeadFollowUpService = require('./LeadFollowUpService');
          await LeadFollowUpService.enrollLead(syncedCustomer.companyId, syncedCustomer.id, contact.id);
        } else if (existingEnrollment.lastSentAt) {
          // Lead replied after receiving a follow-up → mark as replied
          const LeadFollowUpService = require('./LeadFollowUpService');
          await LeadFollowUpService.markReplied(contact.id);
        }
      } catch (e) {
        console.error('[LEAD-FOLLOWUP] Error enrolling lead:', e.message);
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
