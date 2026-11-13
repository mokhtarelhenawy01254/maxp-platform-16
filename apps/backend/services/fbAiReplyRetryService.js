'use strict';

/**
 * fbAiReplyRetryService.js
 *
 * Progressive retry engine for Facebook AI and outbound messages using AiDeliveryOutbox.
 * Implements 3 critical guards:
 *  1. Anti-duplication / Superseded guard: Cancels retry if staff or newer AI replied.
 *  2. Meta 24-hour window guard: Aborts gracefully if customer window expired.
 *  3. Idempotency & lock guard: Distributed lock with TTL prevents parallel double-sends.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');

const RETRY_DELAYS_MS = [5000, 10000, 30000, 60000, 120000]; // 5s, 10s, 30s, 1m, 2m
const TOTAL_CAP_MS = 15 * 60 * 1000; // 15 minutes max
const SWEEP_INTERVAL_MS = 20000; // 20s

let sweeperInterval = null;

/**
 * Enqueue a failed or pending Facebook message into AiDeliveryOutbox
 */
async function enqueueOutboxDelivery({
  companyId,
  conversationId,
  customerId,
  messageId,
  pageId,
  recipientId,
  messageContent,
  messageType = 'TEXT',
  fbReplyToId = null,
  error = null,
}) {
  const prisma = getSharedPrismaClient();
  const outboxKey = `${conversationId}:${messageId}`;

  try {
    const errorMsg = error ? (error.message || String(error)) : 'Initial delivery pending';

    // Upsert into AiDeliveryOutbox
    const outboxItem = await prisma.aiDeliveryOutbox.upsert({
      where: { outboxKey },
      create: {
        id: crypto.randomUUID(),
        companyId,
        outboxKey,
        channel: 'FACEBOOK',
        status: 'PENDING',
        messageType,
        recipientId,
        pageId,
        conversationId,
        customerId,
        messageId,
        attempts: 1,
        maxAttempts: RETRY_DELAYS_MS.length,
        availableAt: new Date(Date.now() + RETRY_DELAYS_MS[0]),
        lastError: errorMsg,
        payload: JSON.stringify({ messageContent, replyToMessageId: fbReplyToId }),
      },
      update: {
        availableAt: new Date(Date.now() + RETRY_DELAYS_MS[0]),
        lastError: errorMsg,
      },
    });

    // Update Message deliveryStatus to PENDING (or mark FAILED if non-retryable)
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deliveryStatus: 'PENDING',
      },
    }).catch(() => {});

    console.log(`📬 [FB-OUTBOX] Enqueued failed delivery into outbox (${outboxKey}), next attempt in 5s`);
    return outboxItem;
  } catch (err) {
    console.error(`❌ [FB-OUTBOX] Failed to enqueue into AiDeliveryOutbox:`, err.message);
    return null;
  }
}

/**
 * Process a single outbox delivery item with guards
 */
async function processSingleOutboxItem(outboxItem) {
  const prisma = getSharedPrismaClient();
  const lockToken = crypto.randomUUID();

  // Guard: Acquire Lock
  try {
    const locked = await prisma.aiDeliveryOutbox.updateMany({
      where: {
        id: outboxItem.id,
        status: 'PENDING',
        OR: [
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: new Date() } },
        ],
      },
      data: {
        lockedAt: new Date(),
        lockToken,
        lockExpiresAt: new Date(Date.now() + 60000), // 60s lock
      },
    });

    if (locked.count === 0) {
      return { success: false, reason: 'locked_or_processed' };
    }
  } catch (lockErr) {
    return { success: false, reason: 'lock_error', error: lockErr.message };
  }

  try {
    // ── Guard 1: Has anyone replied after the original message was created? ──
    const newerReply = await prisma.message.findFirst({
      where: {
        conversationId: outboxItem.conversationId,
        isFromCustomer: false,
        createdAt: { gt: outboxItem.createdAt },
        id: { not: outboxItem.messageId },
      },
      select: { id: true, createdAt: true, senderType: true },
    });

    if (newerReply) {
      console.log(`🛑 [FB-OUTBOX] Cancelling outbox item ${outboxItem.outboxKey}: superseded by newer reply ${newerReply.id}`);
      await prisma.aiDeliveryOutbox.update({
        where: { id: outboxItem.id },
        data: {
          status: 'CANCELLED',
          lastError: `Superseded by newer reply (${newerReply.id})`,
          lockExpiresAt: null,
        },
      });
      return { success: false, reason: 'superseded' };
    }

    // ── Guard 2: Meta 24-Hour Messaging Window ──
    const conversation = await prisma.conversation.findUnique({
      where: { id: outboxItem.conversationId },
      select: { lastInboundAt: true, windowExpiresAt: true, isWindowExpired: true },
    });

    let isWindowExpired = false;
    if (conversation?.windowExpiresAt) {
      isWindowExpired = new Date(conversation.windowExpiresAt).getTime() <= Date.now();
    } else if (conversation?.lastInboundAt) {
      isWindowExpired = new Date(conversation.lastInboundAt).getTime() + 24 * 60 * 60 * 1000 <= Date.now();
    }

    if (isWindowExpired) {
      console.warn(`⚠️ [FB-OUTBOX] Meta 24h window expired for conversation ${outboxItem.conversationId}. Marking EXHAUSTED.`);
      await prisma.aiDeliveryOutbox.update({
        where: { id: outboxItem.id },
        data: {
          status: 'EXHAUSTED',
          lastError: 'Meta 24-hour messaging window expired. Standard reply rejected by Facebook.',
          lockExpiresAt: null,
        },
      });
      await prisma.message.update({
        where: { id: outboxItem.messageId },
        data: { deliveryStatus: 'FAILED' },
      }).catch(() => {});

      notifyDeliveryStatus(outboxItem.companyId, outboxItem.conversationId, outboxItem.messageId, 'FAILED');
      return { success: false, reason: 'window_expired' };
    }

    // ── Execute Delivery Attempt ──
    const { getPageToken } = require('../utils/allFunctions');
    const pageData = await getPageToken(outboxItem.pageId);
    const token = pageData?.pageAccessToken;

    if (!token) {
      throw new Error(`Facebook page ${outboxItem.pageId} disconnected or missing access token`);
    }

    let payload = {};
    try {
      payload = JSON.parse(outboxItem.payload || '{}');
    } catch (e) {
      payload = { messageContent: outboxItem.payload };
    }

    const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');
    const fbResult = await sendProductionFacebookMessage(
      outboxItem.recipientId,
      payload.messageContent,
      outboxItem.messageType || 'TEXT',
      outboxItem.pageId,
      token,
      payload.replyToMessageId
    );

    if (fbResult && fbResult.success) {
      console.log(`✅ [FB-OUTBOX] Outbox item delivered successfully to Facebook: ${outboxItem.outboxKey}`);
      await prisma.aiDeliveryOutbox.update({
        where: { id: outboxItem.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          facebookMessageId: fbResult.messageId || null,
          lockExpiresAt: null,
        },
      });

      // Update Message state
      const targetMsg = await prisma.message.findUnique({
        where: { id: outboxItem.messageId },
        select: { metadata: true },
      });
      let parsedMeta = {};
      try {
        parsedMeta = typeof targetMsg?.metadata === 'string' ? JSON.parse(targetMsg.metadata) : (targetMsg?.metadata || {});
      } catch (e) {}

      await prisma.message.update({
        where: { id: outboxItem.messageId },
        data: {
          deliveryStatus: 'SENT',
          metadata: JSON.stringify({
            ...parsedMeta,
            facebookMessageId: fbResult.messageId || null,
            sentToFacebook: true,
            deliveredViaOutbox: true,
            deliveredAt: new Date(),
          }),
        },
      }).catch(() => {});

      if (fbResult.messageId) {
        try {
          const { recordSystemSentFacebookMessage } = require('../utils/facebookMessageTracker');
          recordSystemSentFacebookMessage(fbResult.messageId, {
            isAi: true,
            source: 'outbox_retry',
            conversationId: outboxItem.conversationId,
          });
        } catch (tErr) {}
      }

      notifyDeliveryStatus(outboxItem.companyId, outboxItem.conversationId, outboxItem.messageId, 'SENT');
      return { success: true, messageId: fbResult.messageId };
    } else {
      throw new Error(fbResult?.message || fbResult?.error || 'Unknown Facebook API send failure');
    }

  } catch (attemptErr) {
    console.warn(`⚠️ [FB-OUTBOX] Delivery attempt failed for ${outboxItem.outboxKey}: ${attemptErr.message}`);

    const nextAttempt = outboxItem.attempts + 1;
    const isExhausted = nextAttempt >= (outboxItem.maxAttempts || 5) || (Date.now() - new Date(outboxItem.createdAt).getTime() >= TOTAL_CAP_MS);

    if (isExhausted) {
      console.error(`❌ [FB-OUTBOX] Outbox item exhausted after ${outboxItem.attempts} attempts: ${outboxItem.outboxKey}`);
      await prisma.aiDeliveryOutbox.update({
        where: { id: outboxItem.id },
        data: {
          status: 'EXHAUSTED',
          attempts: nextAttempt,
          lastError: attemptErr.message,
          lockExpiresAt: null,
        },
      });
      await prisma.message.update({
        where: { id: outboxItem.messageId },
        data: { deliveryStatus: 'FAILED' },
      }).catch(() => {});

      notifyDeliveryStatus(outboxItem.companyId, outboxItem.conversationId, outboxItem.messageId, 'FAILED');
    } else {
      const delayMs = RETRY_DELAYS_MS[Math.min(outboxItem.attempts, RETRY_DELAYS_MS.length - 1)] || 30000;
      await prisma.aiDeliveryOutbox.update({
        where: { id: outboxItem.id },
        data: {
          status: 'PENDING',
          attempts: nextAttempt,
          availableAt: new Date(Date.now() + delayMs),
          lastError: attemptErr.message,
          lockExpiresAt: null,
        },
      });
    }

    return { success: false, error: attemptErr.message, isExhausted };
  }
}

/**
 * Sweeper: Polls pending outbox records and delivers them
 */
async function sweepOutbox() {
  const prisma = getSharedPrismaClient();
  try {
    const pendingItems = await prisma.aiDeliveryOutbox.findMany({
      where: {
        status: 'PENDING',
        channel: 'FACEBOOK',
        availableAt: { lte: new Date() },
        OR: [
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: new Date() } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    if (pendingItems.length === 0) return;

    console.log(`🧹 [FB-OUTBOX-SWEEPER] Found ${pendingItems.length} pending items ready for retry`);
    for (const item of pendingItems) {
      await processSingleOutboxItem(item);
    }
  } catch (sweepErr) {
    console.error(`❌ [FB-OUTBOX-SWEEPER] Error during sweep:`, sweepErr.message);
  }
}

/**
 * Start background polling sweeper
 */
function startOutboxSweeper() {
  if (sweeperInterval) return;
  sweeperInterval = setInterval(sweepOutbox, SWEEP_INTERVAL_MS);
  if (sweeperInterval.unref) sweeperInterval.unref();
  console.log(`🚀 [FB-OUTBOX-SWEEPER] Background retry sweeper started (interval: ${SWEEP_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop background sweeper (used for graceful teardown)
 */
function stopOutboxSweeper() {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
}

/**
 * Real-time socket notifier for message delivery updates
 */
function notifyDeliveryStatus(companyId, conversationId, messageId, deliveryStatus) {
  try {
    const socketService = require('./socketService');
    const io = socketService.getIO();
    if (io && companyId) {
      io.to(`company_${companyId}`).emit('message_delivery_update', {
        conversationId,
        messageId,
        deliveryStatus,
        timestamp: new Date(),
      });
    }
  } catch (e) {}
}

/**
 * Manual Retry from staff UI
 */
async function retryMessageById(messageId, companyId) {
  const prisma = getSharedPrismaClient();
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: { not: null } },
    include: {
      conversation: {
        select: { id: true, companyId: true, senderId: true, metadata: true },
      },
    },
  });

  if (!message || (companyId && message.conversation?.companyId !== companyId)) {
    throw new Error('Message not found or unauthorized');
  }

  let meta = {};
  try {
    meta = typeof message.metadata === 'string' ? JSON.parse(message.metadata) : (message.metadata || {});
  } catch (e) {}

  const pageId = meta.pageId || (meta.pageData && meta.pageData.pageId);
  const recipientId = meta.recipientId || message.conversation.senderId;

  // Enqueue / reset in outbox with immediate availability
  const outboxKey = `${message.conversationId}:${message.id}`;
  await prisma.aiDeliveryOutbox.upsert({
    where: { outboxKey },
    create: {
      id: crypto.randomUUID(),
      companyId: message.conversation.companyId,
      outboxKey,
      channel: 'FACEBOOK',
      status: 'PENDING',
      messageType: message.type || 'TEXT',
      recipientId,
      pageId,
      conversationId: message.conversationId,
      messageId: message.id,
      attempts: 0,
      maxAttempts: 5,
      availableAt: new Date(),
      payload: JSON.stringify({ messageContent: message.content }),
    },
    update: {
      status: 'PENDING',
      attempts: 0,
      availableAt: new Date(),
      lockExpiresAt: null,
      lastError: null,
    },
  });

  // Re-fetch and run immediately
  const item = await prisma.aiDeliveryOutbox.findUnique({ where: { outboxKey } });
  return await processSingleOutboxItem(item);
}

module.exports = {
  enqueueOutboxDelivery,
  processSingleOutboxItem,
  sweepOutbox,
  startOutboxSweeper,
  stopOutboxSweeper,
  retryMessageById,
};
