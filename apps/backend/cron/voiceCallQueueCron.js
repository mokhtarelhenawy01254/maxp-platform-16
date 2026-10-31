/**
 * Voice Call Queue Cron Service
 * Processes pending & retry calls from ai_runtime_queue_jobs
 */

const { claimDueJobs, completeJob, cleanupStaleJobs } = require('../services/voice/voiceCallQueue');
const voiceCallService = require('../services/voice/voiceCallService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

let timer = null;
let isRunning = false;

async function processQueueBatch(limit = 10) {
  if (isRunning) return { skipped: 'ALREADY_RUNNING' };
  isRunning = true;
  try {
    // 1. Recover any stale locked jobs (lease expired > 300s)
    await cleanupStaleJobs();

    // 2. Claim due jobs
    const workerId = `voice-cron-${process.pid}-${Date.now()}`;
    const jobs = await claimDueJobs(limit, workerId);

    if (!jobs || jobs.length === 0) {
      return { processed: 0 };
    }

    const prisma = getSharedPrismaClient();

    for (const job of jobs) {
      try {
        let input = {};
        try {
          input = typeof job.inputSnapshot === 'string' ? JSON.parse(job.inputSnapshot) : job.inputSnapshot;
        } catch (_) {}

        const result = await voiceCallService.dispatchOrderConfirmationCall({
          companyId: job.companyId,
          orderId: input.orderId || null,
          guestOrderId: input.guestOrderId || null,
          orderNumber: input.orderNumber,
          customerPhone: input.phone,
          customerName: input.customerName,
          total: input.total,
          force: false,
        });

        if (result?.scheduled) {
          // Outside working hours: reschedule availableAt to nextWindowStart
          await prisma.aiRuntimeQueueJob.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              availableAt: new Date(result.scheduledFor),
              lockToken: null,
              lockExpiresAt: null,
            },
          });
        }
      } catch (err) {
        console.error(`[VOICE-CRON] Error processing job ${job.id}:`, err.message);
        await completeJob(job.id, {
          outcome: 'failed',
          notes: err.message,
        });
      }
    }

    return { processed: jobs.length };
  } catch (err) {
    console.error('[VOICE-CRON] Batch loop error:', err.message);
    return { error: err.message };
  } finally {
    isRunning = false;
  }
}

async function runOnce(limit = 10) {
  return await processQueueBatch(limit);
}

function start(intervalMs = 60000) {
  if (timer) return;
  timer = setInterval(() => {
    processQueueBatch(10).catch((e) => console.error('[VOICE-CRON] interval error:', e));
  }, intervalMs);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  start,
  stop,
  runOnce,
  processQueueBatch,
};
