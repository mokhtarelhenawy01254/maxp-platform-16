/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º1.1):
 * ╪╖╪º╪¿┘ê╪▒ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ΓÇö ┘à╪╣╪º┘ä╪¼╪⌐ WhatsAppNotificationQueue ╪╣╪¿╪▒ BullMQ.
 * ┘è╪¡┘ä ┘à╪┤┘â┘ä╪⌐ processNotificationQueue() ╪º┘ä┘à┘è╪¬╪⌐ ΓåÆ quiet-hours + ╪º┘ä┘à╪¼╪»┘ê┘ä╪⌐ ╪¬┘Å╪▒╪│┘ä ╪º┘ä╪ó┘å.
 *
 * ┘à╪▒╪¼╪╣ ╪º┘ä┘å┘à╪╖: queues/webhookQueue.js + services/queueService.js
 * (BullMQ + ioredis ┘à╪½╪¿╪¬╪º┘å ╪¿╪º┘ä┘ü╪╣┘ä ┘ü┘è package.json).
 */
const { Worker, Queue } = require('bullmq');
const redisConfig = require('../../config/redis');
const { processNotificationQueue } = require('./WhatsAppNotificationService');
const { getSharedPrismaClient } = require('../sharedDatabase');

const QUEUE_NAME = 'whatsapp-notifications';
const OVERDUE_THRESHOLD_MS = 2 * 60 * 1000; // 2 ╪»┘é┘è┘é╪⌐
const OVERDUE_ALERT_AT = 10; // ╪╣╪┤┘æ╪▒┘è╪⌐ ╪╣┘å╪º╪╡╪▒ ┘à╪│╪¬╪¡┘é╪⌐ ╪ú┘ê ╪ú┘â╪½╪▒ = ╪¬┘å╪¿┘è┘ç

let worker = null;
let fallbackTimer = null;
let started = false;

// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.3): ╪¬┘å╪¿┘è┘ç ╪╣┘å╪» ╪¬╪▒╪º┘â┘à ╪º┘ä╪╖╪º╪¿┘ê╪▒
async function checkOverdueAndAlert() {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.whatsAppNotificationQueue) return;
    const overdue = await prisma.whatsAppNotificationQueue.count({
      where: { status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - OVERDUE_THRESHOLD_MS) } },
    });
    if (overdue > OVERDUE_ALERT_AT) {
      console.error(`≡ƒÜ¿ [NOTIF-QUEUE] ${overdue} notifications overdue (>2min) ΓÇö check worker/Redis/META_CLOUD`);
    }
  } catch (err) {
    console.error('[NOTIF-QUEUE] overdue check failed:', err.message);
  }
}

async function runQueueTick() {
  await processNotificationQueue();
  await checkOverdueAndAlert();
}

function isRedisConfigured() {
  const env = process.env;
  return Boolean(
    env.REDIS_URL ||
    (env.REDIS_HOST && env.REDIS_HOST !== 'production-redis-host')
  );
}

/**
 * ┘à╪¡┘ü┘æ╪▓ (trigger) BullMQ ΓÇö ╪º┘ä┘Ç Worker ┘ç┘å╪º ┘ü┘é╪╖ "┘è┘ê┘é╪╕" ╪º┘ä┘à╪╣╪º┘ä╪¼ ╪º┘ä╪»┘ê╪▒┘è
 * ╪º┘ä╪░┘è ┘è┘ä╪¬┘é╪╖ PENDING ┘à┘å WhatsAppNotificationQueue.
 * ╪ú╪¿┘é┘è┘å╪º processNotificationQueue ┘â┘à╪╡╪»╪▒ ╪º┘ä╪¡┘é┘è┘é╪⌐ ╪º┘ä┘ê╪¡┘è╪» (┘ä╪º ╪¬┘â╪▒╪º╪▒ ┘à┘å╪╖┘é).
 * ╪º┘ä┘Ç repeat job (┘â┘ä ╪»┘é┘è┘é╪⌐) ┘è┘Å╪»╪º╪▒ ╪¿┘ê╪º╪│╪╖╪⌐ BullMQ/Redis╪î ┘ü┘ä╪º ┘è╪¬┘â╪▒╪▒ ╪╣╪¿╪▒
 * ┘å╪│╪« ┘à╪¬╪╣╪»╪»╪⌐ ┘à┘å ╪º┘ä┘Ç backend.
 */
function startNotificationQueueWorker() {
  if (started) return;

  if (!isRedisConfigured()) {
    console.warn('ΓÜá∩╕Å [NOTIF-QUEUE] Redis ╪║┘è╪▒ ┘à┘Å╪╣╪» ΓÇö ╪º┘ä╪╖╪º╪¿┘ê╪▒ ╪│┘è╪╣┘à┘ä ╪¿┘Ç fallback polling');
    startFallbackPolling();
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async () => {
      await runQueueTick();
    },
    {
      connection: redisConfig,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) =>
    console.error(`Γ¥î [NOTIF-QUEUE] Job ${job?.id} failed:`, err.message)
  );
  worker.on('error', (err) =>
    console.error(`Γ¥î [NOTIF-QUEUE] Worker error:`, err.message)
  );

  // ╪¼╪»┘ê┘ä╪⌐ ╪¬┘â╪▒╪º╪▒┘è╪⌐: ╪»┘ü╪╣╪⌐ ┘â┘ä 60 ╪½╪º┘å┘è╪⌐. BullMQ ┘è╪╢┘à┘å ╪╣╪»┘à ╪¬┘â╪▒╪º╪▒ ╪º┘ä┘Ç repeat ╪╣╪¿╪▒ ╪º┘ä┘Ç instances.
  const queue = new Queue(QUEUE_NAME, { connection: redisConfig });
  queue
    .add(
      'process-pending',
      {},
      {
        repeat: { pattern: '* * * * *' },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    )
    .catch((e) => console.error('[NOTIF-QUEUE] schedule failed:', e.message));

  started = true;
  console.log('Γ£à [NOTIF-QUEUE] WhatsApp notification queue worker started');
}

/**
 * fallback: polling ╪¿╪│┘è╪╖ ╪¿╪»┘ê┘å Redis (┘è╪¡╪º┘â┘è ╪º┘ä╪│┘ä┘ê┘â ╪º┘ä┘à┘é╪╡┘ê╪»).
 * ╪º╪│╪¬╪«╪»┘à ┘ü┘è ╪º┘ä╪¿┘è╪ª╪º╪¬ ╪¿╪»┘ê┘å Redis ┘ü┘é╪╖.
 */
function startFallbackPolling() {
  if (started) return;
  fallbackTimer = setInterval(async () => {
    try {
      await runQueueTick();
    } catch (e) {
      console.error('[NOTIF-QUEUE] fallback tick failed:', e.message);
    }
  }, 60000);
  if (typeof fallbackTimer.unref === 'function') fallbackTimer.unref();
  started = true;
  console.log('Γ£à [NOTIF-QUEUE] Fallback polling started (60s)');
}

async function stopNotificationQueueWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  started = false;
}

module.exports = {
  startNotificationQueueWorker,
  stopNotificationQueueWorker,
};
