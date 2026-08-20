const { getSharedPrismaClient, executeWithRetry } = require('../sharedDatabase');
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

// Per-key async mutex: يمنع سباق (race) check-then-create لنفس المفتاح.
// آمن لأن الـ backend بيشتغل كعملية واحدة (PM2 single instance).
const keyLocks = new Map();

// 🚨 FIX (deadlock): النسخة السابقة كانت `gate = prev.then(() => current)` —
// ده كان بيجعل `await gate` للمُتصل الأول ينتظر `current` (اللي بيتحل بس في
// release بعد fn) → deadlock: أول استدعاء لأي مفتاح كان بيعلّق للأبد.
// الصحيح: gate = وعد إطلاق المُتصل السابق (أو Promise.resolve() لأول مُتصل)،
// و`current` (وعد إطلاق المُتصل الحالي) يبقى هو prev للمُتصل التالي.
function acquireKeyLock(key) {
  const prev = keyLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((r) => (release = r));
  keyLocks.set(key, current);
  return { gate: prev, release, current };
}

async function withKeyLock(key, fn) {
  const { gate, release, current } = acquireKeyLock(key);
  await gate;
  try {
    return await fn();
  } finally {
    release();
    // لو مفيش مُتصل تاني سجّل (حطّ current جديد) نحذف المفتاح من الخريطة
    if (keyLocks.get(key) === current) {
      keyLocks.delete(key);
    }
  }
}

// الـ metadata دايمًا مكتوب بـ buildConversationMetadata (JSON.stringify → quoted) —
// فبنجيب الفروع المقتبسة بس (اللي بتطابق فعلًا) ونشيل الفروع غير المقتبسة الميتة اللي
// كانت ممكن تسبب false-match (مثال: sessionId:12 تطابق sessionId:123).
const buildSessionMetadataWhere = (sessionId) => ({
  OR: [
    { metadata: { contains: `"sessionId":"${sessionId}"` } },
    { metadata: { contains: `"whatsappSessionId":"${sessionId}"` } }
  ]
});

const WhatsAppSyncService = {
  async findOrCreateCustomer(companyId, phoneNumber, pushName, profilePicUrl) {
    const prisma = getSharedPrismaClient();
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    const canonicalPhone = require('../../utils/phoneNormalization').toCanonicalE164(cleanPhone);
    const { splitCustomerName } = require('../../utils/customerName');

    const nameParts = splitCustomerName(pushName);

    // Per-key lock: رسايل متزامنة لنفس الرقم تنفذ واحدة ورا التانية (منع الـ duplicate customers)
    const lockKey = `customer:${companyId}:${canonicalPhone || cleanPhone}`;
    return withKeyLock(lockKey, async () => {
      // executeWithRetry: خطأ DB مؤقت يعيد المحاولة بدل ما الرسالة تضيع من الـ CRM
      // (find-or-create idempotent + متزامن بـ mutex → retry آمن)
      return executeWithRetry(async () => {
        const where = {
          companyId,
          OR: [
            { phone: cleanPhone },
            { whatsappId: cleanPhone },
            { phoneNormalized: canonicalPhone },
            ...(cleanPhone ? [{ phone: { in: require('../../utils/phoneNormalization').getPhoneVariants(cleanPhone) } }] : [])
          ]
        };

        let customer = await prisma.customer.findFirst({ where });

        if (customer) {
          // صف موجود عبر variant — حدّث الحقول الناقصة بس
          const patchData = {};
          if (!customer.phoneNormalized && cleanPhone) {
            patchData.phoneNormalized = canonicalPhone;
          }
          if (profilePicUrl && !customer.avatar) {
            patchData.avatar = profilePicUrl;
          }
          if (cleanPhone && customer.whatsappId !== cleanPhone) {
            patchData.whatsappId = cleanPhone;
          }
          if (Object.keys(patchData).length > 0) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: patchData
            });
          }
        } else if (!cleanPhone) {
          // مفيش رقم (مجموعة/LID غير محلول) — create عادي بـ phone null.
          // مفيش unique constraint على (companyId, phone) لسه مطبق في الـ DB،
          // والـ unique على whatsappId/phone بيقبل null متعدد.
          customer = await prisma.customer.create({
            data: {
              companyId,
              firstName: nameParts.firstName,
              lastName: nameParts.lastName,
              phone: null,
              phoneNormalized: null,
              whatsappId: null,
              avatar: profilePicUrl,
              status: 'LEAD'
            }
          });
        } else {
          const createData = {
            companyId,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            phone: cleanPhone,
            phoneNormalized: canonicalPhone,
            whatsappId: cleanPhone,
            avatar: profilePicUrl,
            status: 'LEAD'
          };

          try {
            customer = await prisma.customer.create({ data: createData });
          } catch (err) {
            // P2002 (unique violation على whatsappId/companyId أو (companyId, phone) لما
            // الـ index يتطبق لاحقاً): نفس الرقم وصل بصيغة مختلفة واتعمل من مصدر تاني
            // في نفس اللحظة → نرجّع الصف الموجود بدل ما نفشل (وإلا الرسالة تضيع من الـ CRM)
            if (err?.code === 'P2002') {
              customer = await prisma.customer.findFirst({ where });
              if (!customer) throw err;
            } else {
              throw err; // خطأ حقيقي → executeWithRetry يعيد المحاولة
            }
          }
        }

        return customer;
      });
    });
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

    // Per-key lock: نفس العميل/الجلسة/المحادثة يتزامن بدل ما يتعمل conversation مكرر
    const lockKey = `conv:${companyId}:${customerId}:${sessionId || ''}:${remoteJid || ''}`;
    return withKeyLock(lockKey, async () => {
      // executeWithRetry: خطأ DB مؤقت يعيد المحاولة (find-or-create idempotent)
      return executeWithRetry(async () => {
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
      });
    });
  },

  async syncMessage(companyId, sessionId, remoteJid, messageData, isIncoming, isNewMessage = true) {
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

      // ملاحظة: لا يوجد early-return على isNewMessage === false هنا.
      // الـ dedup الصحيح لازم يكون على الـ CRM Message row (اللي ممكن يفشل)، مش على الـ WhatsApp
      // row (اللي بينجح). لو الـ CRM sync فشل مرة واحدة ثم اتعاد إرسال نفس الرسالة، لازم يفضل
      // بيتحاول — والـ dedup الداخلي (whatsAppMessageId في metadata) بيمنع التكرار وبيصلح الفقدان.

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

      // Idempotent CRM message write: يحفظ الـ WhatsApp messageId في الـ metadata
      // عشان retry/إعادة إرسال (reconnect replay) متعملش duplicate.
      const waMessageId = messageData.messageId || null;
      const baseMetadata = (typeof messageData.metadata === 'string' ? JSON.parse(messageData.metadata) : (messageData.metadata || {})) || {};
      const crmMetadata = { ...baseMetadata, whatsAppMessageId: waMessageId };

      let wasCreated = false;
      const message = await executeWithRetry(async () => {
        if (waMessageId) {
          const existing = await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              metadata: { contains: `"whatsAppMessageId":"${waMessageId}"` }
            },
            select: { id: true }
          });
          if (existing) return existing;
        }
        wasCreated = true;
        return prisma.message.create({
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
            metadata: JSON.stringify(crmMetadata),
            isFromCustomer: isIncoming,
            senderId: isIncoming ? null : (messageData.senderId || null),
            createdAt: messageData.timestamp || new Date(),
            isRead: !isIncoming
          }
        });
      });

      // إعادة إرسال (isNewMessage=false بس الـ CRM ملقاش الصف) → نكتب بس من غير
      // نزوّد الـ unread ولا نعطي assignment ولا notify (دول مش idempotent).
      if (!wasCreated) {
        return { customer, conversation, message };
      }

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
