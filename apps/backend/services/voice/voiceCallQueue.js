/**
 * Voice Call Queue Service
 * Built directly on shared ai_runtime_queue_jobs and ai_runtime_ledger tables.
 * Provides lease-based job locking, retry management, and deterministic deduplication.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const orderConfirmationService = require('../orderConfirmationService');

/**
 * Enqueue a new order confirmation call
 * Uses unique queueKey = call:{companyId}:{orderNumber} to prevent double enqueueing.
 */
async function enqueueCall({
  companyId,
  orderId = null,
  guestOrderId = null,
  orderNumber,
  phone,
  customerName = '',
  total = 0,
  metadata = {},
  scheduledFor = null,
}) {
  if (!companyId || !orderNumber) {
    throw new Error('companyId and orderNumber are required to enqueue a call');
  }

  const prisma = getSharedPrismaClient();
  const queueKey = `call:${companyId}:${orderNumber}`;

  // Get max attempts from OrderConfirmationSettings (0 = unlimited / 99)
  let maxAttempts = 3;
  try {
    const confSettings = await orderConfirmationService.getSettings(companyId);
    if (confSettings) {
      const normalized = orderConfirmationService.normalizeSettings(confSettings);
      if (normalized.maxCallsNoAnswer === 0) {
        maxAttempts = 99;
      } else if (normalized.maxCallsNoAnswer > 0) {
        maxAttempts = normalized.maxCallsNoAnswer;
      }
    }
  } catch (err) {
    console.warn('[VOICE-QUEUE] Could not fetch OrderConfirmationSettings:', err.message);
  }

  const inputSnapshot = {
    companyId,
    orderId: orderId || null,
    guestOrderId: guestOrderId || null,
    orderNumber,
    phone: phone || '',
    customerName: customerName || '',
    total: Number(total || 0),
    source: metadata?.source || 'storefront',
    paymentMethod: metadata?.paymentMethod || 'COD',
    metadata: metadata || {},
  };

  const availableAt = scheduledFor ? new Date(scheduledFor) : new Date();

  try {
    const job = await prisma.aiRuntimeQueueJob.create({
      data: {
        companyId,
        queueKey,
        channel: 'VOICE_CALL',
        status: 'PENDING',
        priority: 0,
        attempts: 0,
        maxAttempts,
        availableAt,
        inputSnapshot: JSON.stringify(inputSnapshot),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return { success: true, queued: true, job };
  } catch (error) {
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return { skipped: 'ALREADY_QUEUED', queueKey };
    }
    throw error;
  }
}

/**
 * Claim due jobs using SELECT ... FOR UPDATE SKIP LOCKED
 * Lease duration: 300 seconds
 */
async function claimDueJobs(limit = 10, workerId = 'voice-worker') {
  const prisma = getSharedPrismaClient();

  try {
    const jobs = await prisma.$queryRawUnsafe(
      `SELECT id, "queueKey", "companyId", channel, status, priority, attempts, "maxAttempts",
              "availableAt", "startedAt", "inputSnapshot", "resultSnapshot", metadata
         FROM ai_runtime_queue_jobs
        WHERE channel = 'VOICE_CALL'
          AND status IN ('PENDING', 'RETRY')
          AND "availableAt" <= NOW()
        ORDER BY priority DESC, "availableAt" ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      Number(limit)
    );

    if (!jobs || jobs.length === 0) {
      return [];
    }

    const claimedJobs = [];
    const now = new Date();
    const lockExpiresAt = new Date(Date.now() + 300 * 1000);

    for (const job of jobs) {
      const updated = await prisma.aiRuntimeQueueJob.updateMany({
        where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
        data: {
          status: 'RUNNING',
          lockToken: workerId,
          lockExpiresAt,
          attempts: { increment: 1 },
          startedAt: job.startedAt || now,
        },
      });
      if (!updated.count) continue; // خدها worker تاني
      const claimed = await prisma.aiRuntimeQueueJob.findUnique({ where: { id: job.id } });
      if (claimed) {
        claimedJobs.push(claimed);
      }
    }

    return claimedJobs;
  } catch (error) {
    console.error('[VOICE-QUEUE] claimDueJobs error:', error.message);
    return [];
  }
}

/**
 * Complete or retry a job based on call outcome
 */
async function completeJob(jobId, { outcome, providerCallId, durationSeconds = 0, recordingUrl = null, notes = null }) {
  const prisma = getSharedPrismaClient();
  const job = await prisma.aiRuntimeQueueJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  let intervalMinutes = 30;
  try {
    const confSettings = await orderConfirmationService.getSettings(job.companyId);
    if (confSettings) {
      const normalized = orderConfirmationService.normalizeSettings(confSettings);
      if (normalized.intervalMinutes > 0) {
        intervalMinutes = normalized.intervalMinutes;
      }
    }
  } catch (_) {}

  const resultSnapshot = JSON.stringify({
    outcome,
    providerCallId: providerCallId || null,
    durationSeconds: Number(durationSeconds || 0),
    recordingUrl: recordingUrl || null,
    notes: notes || null,
    completedAt: new Date().toISOString(),
  });

  const outcomeLower = String(outcome || '').toLowerCase();
  const isSuccess = ['reached', 'completed', 'answered', 'confirmed'].includes(outcomeLower);

  if (isSuccess) {
    return await prisma.aiRuntimeQueueJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        resultSnapshot,
        completedAt: new Date(),
        lockToken: null,
        lockExpiresAt: null,
      },
    });
  }

  // Not reached or failed: check if retry is permitted
  // Note: if maxAttempts is 99 (or 0 originally), it retries up to 99 times
  if (job.attempts < job.maxAttempts) {
    const nextAvailableAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
    return await prisma.aiRuntimeQueueJob.update({
      where: { id: jobId },
      data: {
        status: 'RETRY',
        resultSnapshot,
        availableAt: nextAvailableAt,
        lockToken: null,
        lockExpiresAt: null,
        lastError: notes || outcome,
      },
    });
  }

  // Max attempts reached -> DEAD
  return await prisma.aiRuntimeQueueJob.update({
    where: { id: jobId },
    data: {
      status: 'DEAD',
      resultSnapshot,
      completedAt: new Date(),
      lockToken: null,
      lockExpiresAt: null,
      lastError: `Max attempts (${job.maxAttempts}) reached. Outcome: ${outcome}`,
    },
  });
}

/**
 * Suppress any pending/retry calls for an order that has been CONFIRMED or CANCELLED
 */
async function suppressForOrder(companyId, orderNumber) {
  if (!companyId || !orderNumber) return;
  const prisma = getSharedPrismaClient();
  const queueKey = `call:${companyId}:${orderNumber}`;

  return await prisma.aiRuntimeQueueJob.updateMany({
    where: {
      companyId,
      queueKey,
      status: { in: ['PENDING', 'RETRY', 'RUNNING'] },
    },
    data: {
      status: 'DEAD',
      completedAt: new Date(),
      lastError: 'Suppressed because order was CONFIRMED or CANCELLED',
      lockToken: null,
      lockExpiresAt: null,
    },
  });
}

/**
 * Reset stale locked jobs (lease expired > 300s)
 */
async function cleanupStaleJobs() {
  const prisma = getSharedPrismaClient();
  try {
    return await prisma.$executeRawUnsafe(
      `UPDATE ai_runtime_queue_jobs
          SET status = CASE WHEN attempts >= "maxAttempts" THEN 'DEAD' ELSE 'RETRY' END,
              "lockToken" = NULL,
              "lockExpiresAt" = NULL,
              "lastError" = 'Stale lock recovered'
        WHERE channel = 'VOICE_CALL'
          AND status = 'RUNNING'
          AND "lockExpiresAt" < NOW()`
    );
  } catch (err) {
    console.error('[VOICE-QUEUE] cleanupStaleJobs error:', err.message);
  }
}

/**
 * Schedule a retry/postpone for a call job based on customer request
 */
async function scheduleRetry(companyId, orderNumber, untilDate, reason) {
  const queueKey = `call:${companyId}:${orderNumber}`;
  const prisma = getSharedPrismaClient();
  const job = await prisma.aiRuntimeQueueJob.findUnique({ where: { queueKey } });
  if (!job) return { success: false, reason: 'NO_JOB' };

  let meta = {};
  if (typeof job.metadata === 'string') {
    try {
      meta = JSON.parse(job.metadata || '{}');
    } catch (_) {
      meta = {};
    }
  } else if (job.metadata && typeof job.metadata === 'object') {
    meta = { ...job.metadata };
  }

  const postponeCount = Number(meta.postponeCount || 0);
  if (postponeCount >= 2) {
    return await prisma.aiRuntimeQueueJob.update({
      where: { queueKey },
      data: {
        status: 'DEAD',
        completedAt: new Date(),
        lockToken: null,
        lockExpiresAt: null,
        lastError: 'POSTPONE_LIMIT',
      },
    });
  }

  const updatedMeta = { ...meta, postponeCount: postponeCount + 1 };
  const metadataVal = JSON.stringify(updatedMeta);
  const parsedDate = new Date(untilDate);
  const availableAt = isNaN(parsedDate.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsedDate;

  return await prisma.aiRuntimeQueueJob.update({
    where: { queueKey },
    data: {
      status: 'RETRY',
      availableAt,
      lockToken: null,
      lockExpiresAt: null,
      lastError: `POSTPONED: ${reason}`,
      metadata: metadataVal,
      // ممنوع attempts increment — التأجيل مش محاولة فاشلة
    },
  });
}

module.exports = {
  enqueueCall,
  claimDueJobs,
  completeJob,
  scheduleRetry,
  suppressForOrder,
  cleanupStaleJobs,
};
