const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getTicketAdapter } = require('../services/shippingProviderService');
const ticketThreadService = require('../services/shipping/ticketThreadService');

let cronInterval = null;
let isRunning = false;

async function syncThreadMessages({ prisma, companyId, thread, adapter, settings }) {
  const messagesResult = await adapter.getMessages({
    companyId,
    ticketId: thread.externalId,
  });

  if (!messagesResult || !messagesResult.success || !Array.isArray(messagesResult.messages)) {
    return { newMessagesCount: 0 };
  }

  let newMessagesCount = 0;

  for (const msg of messagesResult.messages) {
    // 1) Append message to DB (P2002 handles dedupe at table level)
    const appendResult = await ticketThreadService.appendMessage(thread.id, {
      companyId,
      direction: msg.direction || 'INBOUND',
      externalId: msg.externalId,
      body: msg.body,
      authorName: msg.authorName,
      sentAt: msg.sentAt,
    });

    if (appendResult.duplicate) {
      continue;
    }

    newMessagesCount++;

    // Only process automation/notifications for INBOUND messages
    if (msg.direction !== 'INBOUND') {
      continue;
    }

    const idempotencyKey = `shipticketmsg:${companyId}:${thread.id}:${msg.externalId}`;

    // 2) Atomic claim in ai_runtime_ledger before taking any external/notification action (T00 §2.3)
    let claimed = false;
    try {
      await prisma.aiRuntimeLedger.create({
        data: {
          companyId,
          idempotencyKey,
          channel: 'CARRIER_SYNC',
          status: 'RUNNING',
          metadata: JSON.stringify({
            threadId: thread.id,
            externalId: msg.externalId,
            code: thread.code,
          }),
        },
      });
      claimed = true;
    } catch (err) {
      if (err.code === 'P2002') {
        // Another worker or run already claimed this message
        continue;
      }
      console.warn(`[CARRIER-SYNC] Ledger claim failed for ${idempotencyKey}:`, err.message);
      continue;
    }

    if (!claimed) continue;

    // 3) Create platform notification once claimed
    try {
      await prisma.aiNotification.create({
        data: {
          companyId,
          type: 'AGENT_SHIPPING_CARRIER_REPLY',
          severity: 'medium',
          title: `رد جديد من ${thread.providerKey}`,
          message: String(msg.body || '').slice(0, 150),
          metadata: JSON.stringify({
            threadId: thread.id,
            orderId: thread.orderId,
            code: thread.code,
            externalId: msg.externalId,
          }),
        },
      });
    } catch (notifErr) {
      console.warn(`[CARRIER-SYNC] Notification creation failed:`, notifErr.message);
    }

    // 4) Apply reply policy (deterministic)
    const policy = ticketThreadService.applyReplyPolicy(thread, msg, settings);

    if (policy === 'AUTO_REPLY') {
      try {
        const replyText = 'العنوان ورقم الهاتف مؤكد، التسليم متاح غداً.';
        const replyRes = await adapter.reply({
          companyId,
          ticketId: thread.externalId,
          message: replyText,
        });

        await ticketThreadService.appendMessage(thread.id, {
          companyId,
          direction: 'OUTBOUND',
          externalId: replyRes?.externalId || `out-${Date.now()}`,
          body: replyText,
          authorName: 'الوكيل الذكي للشحن (رد تلقائي)',
          sentAt: new Date(),
        });

        await prisma.aiRuntimeLedger.update({
          where: { idempotencyKey },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      } catch (replyErr) {
        console.error(`[CARRIER-SYNC] Auto-reply failed for thread ${thread.id}:`, replyErr.message);
        await prisma.aiRuntimeLedger.update({
          where: { idempotencyKey },
          data: { status: 'FAILED' },
        });
      }
    } else {
      // NEEDS_APPROVAL: update status to PENDING_MERCHANT
      await prisma.carrierTicket.update({
        where: { id: thread.id },
        data: { status: 'PENDING_MERCHANT' },
      });

      await prisma.aiRuntimeLedger.update({
        where: { idempotencyKey },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
  }

  return { newMessagesCount };
}

async function syncTickets(options = {}) {
  const prisma = getSharedPrismaClient();
  const { companyId = null, providerKey = null, code = null, threadId = null } = options;

  let totalNewMessages = 0;
  let syncedThreads = 0;

  // Single-thread or manual test sync
  if (threadId) {
    const thread = await prisma.carrierTicket.findUnique({ where: { id: threadId } });
    if (!thread) return { success: false, error: 'Thread not found' };

    const settings = await ticketThreadService.getSettings(thread.companyId);
    const adapter = getTicketAdapter({ providerKey: thread.providerKey });
    const res = await syncThreadMessages({ prisma, companyId: thread.companyId, thread, adapter, settings });
    return { success: true, syncedThreads: 1, newMessagesCount: res.newMessagesCount };
  }

  // DEMO carrier targeted sync (for tests and local QA verification)
  if (providerKey === 'DEMO' && companyId) {
    const settings = await ticketThreadService.getSettings(companyId);
    const adapter = getTicketAdapter({ providerKey: 'DEMO' });

    // Seed/upsert demo thread
    const demoThread = await ticketThreadService.upsertThread({
      companyId,
      providerKey: 'DEMO',
      externalId: 'demo-ticket-001',
      code: code || 'QA-SHIP-001',
      subject: 'استفسار عن عنوان الشحنة ورقم هاتف العميل',
    });

    const res = await syncThreadMessages({ prisma, companyId, thread: demoThread, adapter, settings });
    return { success: true, syncedThreads: 1, newMessagesCount: res.newMessagesCount, threadId: demoThread.id };
  }

  // General company sync
  const companyQuery = companyId
    ? [{ companyId }]
    : await prisma.companyApp.findMany({
        where: {
          status: 'ACTIVE',
          app: { slug: 'order-shipping-turbo' },
        },
        select: { companyId: true },
        distinct: ['companyId'],
      });

  for (const item of companyQuery) {
    const cId = item.companyId;
    const settings = await ticketThreadService.getSettings(cId);

    const maxPerRun = settings.maxPerRun || 25;
    const openThreads = await prisma.carrierTicket.findMany({
      where: {
        companyId: cId,
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      take: maxPerRun,
      orderBy: { updatedAt: 'desc' },
    });

    for (const thread of openThreads) {
      try {
        const adapter = getTicketAdapter({ providerKey: thread.providerKey });
        const res = await syncThreadMessages({ prisma, companyId: cId, thread, adapter, settings });
        syncedThreads++;
        totalNewMessages += res.newMessagesCount;
      } catch (threadErr) {
        console.warn(`[CARRIER-SYNC] Error syncing thread ${thread.id}:`, threadErr.message);
      }
    }
  }

  return { success: true, syncedThreads, totalNewMessages };
}

function start() {
  if (cronInterval) return;
  console.log('🚀 [CARRIER-SYNC] Starting carrier ticket sync cron (every 15 min)...');

  cronInterval = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await syncTickets();
    } catch (err) {
      console.error('❌ [CARRIER-SYNC] Cron cycle error:', err);
    } finally {
      isRunning = false;
    }
  }, 15 * 60 * 1000);
}

function stop() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 [CARRIER-SYNC] Carrier ticket sync cron stopped.');
  }
}

module.exports = {
  start,
  stop,
  syncTickets,
};
