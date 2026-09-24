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
const WhatsAppReactionService = require('./WhatsAppReactionService');
const aiSdkClient = require('../aiSdkClient');
const { getEffectiveAiAutoReplySetting } = require('../aiSettingsResolver');

const getIO = () => socketService.getIO();

const MESSAGE_STATUS_RANK = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4
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
    lastMessageIsFromMe: isOutgoing,
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
    lastMessageIsFromMe: isOutgoing,
    lastCustomerMessageAt: isOutgoing ? undefined : new Date(),
    totalMessages: 1,
    unreadCount: isOutgoing ? 0 : 1,
    isGroup: normalizedJid?.endsWith('@g.us') || false,
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

  // Handle incoming REACTION: apply to target message and notify clients
  if (messageType === 'REACTION' && quotedMessageId) {
    try {
      await WhatsAppReactionService.applyReactionToMessage({
        sessionId,
        companyId,
        remoteJid: normalizedJid,
        targetMessageId: quotedMessageId,
        reactorKey: pushName || normalizedJid || 'customer',
        emoji: content,
        fromMe: false
      });
    } catch (rxErr) {
      console.warn('⚠️ [WhatsAppInbound] Failed to attach reaction to target message:', rxErr.message);
    }
  }

  let syncedCustomer = null;
  let syncedConversation = null;
  try {
    const syncResult = await WhatsAppSyncService.syncMessage(
      companyId,
      sessionId,
      normalizedJid,
      {
        messageId,
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

  // Track broadcast campaign replies
  const phone = normalizedJid.split('@')[0];
  if (phone) {
    const prisma = getSharedPrismaClient();
    prisma.broadcastRecipient.updateMany({
      where: {
        OR: [
          { customerPhone: phone },
          { customerPhone: `+${phone}` }
        ],
        repliedAt: null,
        sentAt: { not: null }
      },
      data: { repliedAt: new Date() }
    }).catch(() => {});
  }

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

  // ── Bot automation (no-AI rules: welcome / keyword / default) ──────────────
  let botHandled = false;
  if (content && messageType === 'TEXT' && syncedCustomer?.companyId) {
    try {
      const { isUnsubscribeText, isUnsubscribed, recordUnsubscribe, UNSUBSCRIBE_CONFIRMATION } = require('../botUnsubscribeService');
      const prisma = getSharedPrismaClient();

      const alreadyUnsubscribed = await isUnsubscribed(syncedCustomer.companyId, syncedCustomer.id, 'WHATSAPP');
      const isStop = isUnsubscribeText(content);
      if (isStop || alreadyUnsubscribed) {
        if (isStop) {
          await recordUnsubscribe(syncedCustomer.companyId, syncedCustomer.id, 'WHATSAPP', content.slice(0, 200));
          await WhatsAppMessageHandler.sendText(sessionId, normalizedJid, UNSUBSCRIBE_CONFIRMATION, {
            isAIResponse: false,
          });
          if (syncedConversation?.id) {
            prisma.message.create({
              data: {
                conversationId: syncedConversation.id,
                content: UNSUBSCRIBE_CONFIRMATION,
                type: 'TEXT',
                isFromCustomer: false,
                metadata: JSON.stringify({ platform: 'whatsapp', source: 'unsubscribe_reply' }),
              },
            }).catch(() => {});
          }
        }
        botHandled = true;
      }

      const { evaluateInboundBotReply } = require('../botRuleEngine');
      const firstContact = (await prisma.whatsAppMessage.count({
        where: { sessionId, remoteJid: normalizedJid }
      })) <= 1;

      const evaluation = await evaluateInboundBotReply({
        companyId: syncedCustomer.companyId,
        text: content,
        channel: 'WHATSAPP',
        customer: {
          firstName: syncedCustomer.firstName,
          lastName: syncedCustomer.lastName,
        },
        isFirstMessage: firstContact,
      });

      if (evaluation?.kind && (evaluation.replyText || evaluation.mediaUrl)) {
        const { buildWhatsAppButtons } = require('../botMessageSender');
        const waButtons = buildWhatsAppButtons(evaluation.buttons);
        if (evaluation.replyType === 'IMAGE' && evaluation.mediaUrl) {
          await WhatsAppMessageHandler.sendImage(sessionId, normalizedJid, evaluation.mediaUrl, evaluation.replyText || '', {
            isAIResponse: false,
          });
        } else if (waButtons.length > 0) {
          await WhatsAppMessageHandler.sendButtons(
            sessionId,
            normalizedJid,
            evaluation.replyText || '',
            waButtons,
            { isAIResponse: false }
          );
        } else {
          await WhatsAppMessageHandler.sendText(sessionId, normalizedJid, evaluation.replyText, {
            isAIResponse: false,
          });
        }
        if (syncedConversation?.id) {
          prisma.message.create({
            data: {
              conversationId: syncedConversation.id,
              content: evaluation.replyText,
              type: 'TEXT',
              isFromCustomer: false,
              metadata: JSON.stringify({
                platform: 'whatsapp',
                source: evaluation.kind === 'smart_reply' ? 'smart_reply' : (evaluation.kind === 'rule' ? 'rule_reply' : (evaluation.kind === 'welcome' ? 'welcome_reply' : 'default_reply')),
                ruleId: evaluation.ruleId || null,
                templateName: evaluation.templateName || null,
                matchedKeyword: evaluation.matchedKeyword || null,
              }),
            },
          }).catch((e) => console.error('[BOT-RULES] Failed to save bot reply:', e.message));
        }
        botHandled = true;
      }

      if (!botHandled && syncedCustomer?.id) {
        const { onCustomerReply } = require('../botFlowRuntime');
        const flowResult = await onCustomerReply({
          companyId: syncedCustomer.companyId,
          customerId: syncedCustomer.id,
          channel: 'WHATSAPP',
          text: content,
          sendStep: async (step) => {
            const { buildWhatsAppButtons } = require('../botMessageSender');
            const waButtons = buildWhatsAppButtons(step.buttons);
            if (waButtons.length > 0) {
              await WhatsAppMessageHandler.sendButtons(sessionId, normalizedJid, step.content, waButtons, {
                isAIResponse: false,
              });
            } else if (step.mediaUrl) {
              await WhatsAppMessageHandler.sendImage(sessionId, normalizedJid, step.mediaUrl, step.content, {
                isAIResponse: false,
              });
            } else {
              await WhatsAppMessageHandler.sendText(sessionId, normalizedJid, step.content, {
                isAIResponse: false,
              });
            }
            if (syncedConversation?.id) {
              prisma.message.create({
                data: {
                  conversationId: syncedConversation.id,
                  content: step.content,
                  type: 'TEXT',
                  isFromCustomer: false,
                  metadata: JSON.stringify({ platform: 'whatsapp', source: 'flow_step' }),
                },
              }).catch(() => {});
            }
          },
        });
        if (flowResult?.handled) {
          botHandled = true;
        }
      }
    } catch (e) {
      console.error('❌ [BOT-RULES] Error in WhatsApp bot automation:', e.message);
    }
  }

  // ── AI auto-reply with debounce ────────────────────────────────────────────
  if (content && messageType === 'TEXT' && syncedCustomer?.companyId && !botHandled) {
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

          if (first.conversationId) {
            const conversation = await prisma.conversation.findUnique({
              where: { id: first.conversationId },
              select: { aiEnabled: true }
            });
            if (conversation && conversation.aiEnabled === false) {
              console.log(`🟡 [WA-DEBOUNCE] AI auto-reply disabled for conversation ${first.conversationId}`);
              return;
            }
          }

          // AI ignore list (do-not-reply): skip auto-reply for listed numbers
          try {
            const _ignorePhone = String(first.customerPhone || (first.normalizedJid || '').split('@')[0] || '').replace(/\D/g, '');
            if (_ignorePhone) {
              const _ignoredRows = await prisma.$queryRaw`SELECT 1 FROM ai.whatsapp_ai_ignore_list WHERE company_id = ${first.companyId} AND phone_number = ${_ignorePhone} LIMIT 1`;
              if (Array.isArray(_ignoredRows) && _ignoredRows.length > 0) {
                console.log(`🚫 [WA-INBOUND] Sender ${_ignorePhone} is on AI ignore list → skipping auto-reply`);
                try {
                  await prisma.$executeRaw`INSERT INTO ai.whatsapp_ai_ignore_log (id, company_id, phone_number, thread_id, message_mid) VALUES (gen_random_uuid(), ${first.companyId}, ${_ignorePhone}, ${String(first.conversationId || '')}, null)`;
                } catch (_logErr) {
                  console.warn('[WA-INBOUND] ignore log insert failed:', _logErr.message);
                }
                return;
              }
            }
          } catch (_ignoreErr) {
            console.warn('[WA-INBOUND] AI ignore list check failed (fail-open):', _ignoreErr.message);
          }

          // Session-level routing: check if this WhatsApp session has a dedicated agent or disabled auto-reply
          let sessionAgentId = null;
          if (first.sessionId) {
            try {
              const waSession = await prisma.whatsAppSession.findUnique({
                where: { id: first.sessionId },
                select: { autoReply: true, aiEnabled: true, metadata: true },
              });
              if (waSession) {
                if (waSession.aiEnabled === false || waSession.autoReply === false) {
                  console.log(`🟡 [WA-DEBOUNCE] AI or autoReply disabled for session ${first.sessionId}`);
                  return;
                }
                const meta = typeof waSession.metadata === 'string' ? JSON.parse(waSession.metadata) : waSession.metadata;
                if (meta?.agentId) {
                  sessionAgentId = meta.agentId;
                  console.log(`🤖 [WA-DEBOUNCE] Session ${first.sessionId} routed to dedicated agent: ${sessionAgentId}`);
                }
              }
            } catch (err) {
              console.warn('[WA-DEBOUNCE] Error checking session agent:', err.message);
            }
          }

          const result = await aiSdkClient.sendChatMessage({
            companyId: first.companyId,
            customerId: first.customerId,
            message: combinedMessage,
            threadId: first.conversationId,
            channel,
            agentId: sessionAgentId,
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

          const rawReplyText = result.reply;
          const { sanitizeAiReply } = require('../../utils/aiReplySanitizer');
          const { cleanedText: replyText, attachments } = sanitizeAiReply(
            rawReplyText,
            result.response_attachments || result.responseAttachments
          );

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
                  metadata: JSON.stringify({
                    platform: 'whatsapp',
                    source: 'ai_reply',
                    attachments: attachments.map(a => ({ type: a.type, url: a.url })),
                  }),
                },
              }).catch(e => console.error('[WA-AI] Failed to save AI reply to DB:', e.message));
            }
          }
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
          // Auto-promote category on reply
          if (contact.leadCategoryId) {
            try {
              const cat = await prisma.leadCategory.findUnique({
                where: { id: contact.leadCategoryId },
                select: { autoPromoteCategoryId: true }
              });
              if (cat?.autoPromoteCategoryId) {
                await prisma.whatsAppContact.update({
                  where: { id: contact.id },
                  data: { leadCategoryId: cat.autoPromoteCategoryId }
                });
                console.log(`[LEAD-FOLLOWUP] Auto-promoted contact ${contact.id} to category ${cat.autoPromoteCategoryId}`);
              }
            } catch (e) {
              console.error('[LEAD-FOLLOWUP] Auto-promotion failed:', e.message);
            }
          }
        }
      } catch (e) {
        console.error('[LEAD-FOLLOWUP] Error enrolling lead:', e.message);
      }
    });
  }

  return savedMessage;
}

async function updateMessageStatus(companyId, messageId, status, options = {}) {
  const prisma = getSharedPrismaClient();
  const { errors = [], recipientId = null, timestamp } = options;

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

  // Update BroadcastRecipient tracking fields when status callbacks arrive
  const updateBroadcastCampaignCount = async (recipientMessageId, field) => {
    const recipient = await prisma.broadcastRecipient.findFirst({
      where: { messageId: recipientMessageId },
      select: { campaignId: true }
    });
    if (recipient) {
      await prisma.broadcastCampaign.update({
        where: { id: recipient.campaignId },
        data: { [field]: { increment: 1 } }
      }).catch(() => {});
    }
  };

  if (status === 'DELIVERED') {
    const { count } = await prisma.broadcastRecipient.updateMany({
      where: { messageId, deliveredAt: null },
      data: { deliveredAt: new Date() }
    });
    if (count > 0) updateBroadcastCampaignCount(messageId, 'deliveredCount');
  } else if (status === 'READ') {
    const { count } = await prisma.broadcastRecipient.updateMany({
      where: { messageId, openedAt: null },
      data: { openedAt: new Date() }
    });
    if (count > 0) updateBroadcastCampaignCount(messageId, 'openedCount');
  } else if (status === 'FAILED') {
    const { count } = await prisma.broadcastRecipient.updateMany({
      where: { messageId, status: { not: 'failed' } },
      data: { status: 'failed', failureReason: 'Delivery failed' }
    });
    if (count > 0) updateBroadcastCampaignCount(messageId, 'failedCount');
  }

  // 🆕 SYNC-NOTIFICATION-LOG: تحديث whatsapp_notification_logs بالحالة الحقيقية
  // من Meta (delivered/read/failed). الـ messageId من الـ webhook (wamid) يطابق
  // whatsappMessageId المحفوظ وقت الإرسال — فنربط الاثنين للحصول على الحالة الفعلية.
  try {
    const logMatch = await prisma.whatsAppNotificationLog.findFirst({
      where: { whatsappMessageId: messageId },
      select: { id: true, status: true }
    });

    if (logMatch) {
      const logUpdate = { updatedAt: new Date() };
      let hasStatusChange = false;
      if (status === 'FAILED') {
        const firstError = errors[0] || {};
        logUpdate.status = 'FAILED';
        logUpdate.failedAt = timestamp ? new Date(timestamp) : new Date();
        logUpdate.errorCode = firstError.code != null ? String(firstError.code) : null;
        logUpdate.failureReason =
          firstError.error_data?.details ||
          firstError.message ||
          firstError.title ||
          `Meta delivery failed (code: ${firstError.code ?? 'unknown'})`;
        hasStatusChange = true;
      } else if (status === 'DELIVERED') {
        // نُرقّي من SENT إلى DELIVERED فقط (ممنوع التراجع من READ/FAILED)
        if (logMatch.status === 'SENT' || logMatch.status === 'PENDING') {
          logUpdate.status = 'DELIVERED';
          logUpdate.deliveredAt = timestamp ? new Date(timestamp) : new Date();
          hasStatusChange = true;
        }
      } else if (status === 'READ') {
        // READ يتضمن DELIVERED — نُرقّي أي حالة سابقة
        if (logMatch.status !== 'FAILED') {
          logUpdate.status = 'READ';
          logUpdate.readAt = timestamp ? new Date(timestamp) : new Date();
          if (!logUpdate.deliveredAt) logUpdate.deliveredAt = logUpdate.readAt;
          hasStatusChange = true;
        }
      }
      // SENT: لا نغيّر شيئاً — الإرسال مسجّل بالفعل وقت الإنشاء

      // نتخطّى الـ update لو مفيش تغيير فعلي في الحالة (مثل FAILED ثم DELIVERED لاحقاً)
      if (hasStatusChange) {
        await prisma.whatsAppNotificationLog.updateMany({
          where: { id: logMatch.id },
          data: logUpdate
        });
      }
    }
  } catch (logSyncErr) {
    console.error('❌ [UPDATE-MSG-STATUS] Failed to sync notification log:', logSyncErr.message);
  }

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
