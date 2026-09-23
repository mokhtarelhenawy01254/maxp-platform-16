/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1):
 * طابور إشعارات واتساب — معالجة WhatsAppNotificationQueue عبر BullMQ.
 * يحل مشكلة processNotificationQueue() الميتة → quiet-hours + المجدولة تُرسل الآن.
 *
 * مرجع النمط: queues/webhookQueue.js + services/queueService.js
 * (BullMQ + ioredis مثبتان بالفعل في package.json).
 */
const { Worker, Queue } = require('bullmq');
const redisConfig = require('../../config/redis');
const { processNotificationQueue } = require('./WhatsAppNotificationService');
const { getSharedPrismaClient } = require('../sharedDatabase');

const QUEUE_NAME = 'whatsapp-notifications';
const OVERDUE_THRESHOLD_MS = 2 * 60 * 1000; // 2 دقيقة
const OVERDUE_ALERT_AT = 10; // عشّرية عناصر مستحقة أو أكثر = تنبيه

let worker = null;
let fallbackTimer = null;
let started = false;

// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3): تنبيه عند تراكم الطابور
async function checkOverdueAndAlert() {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.whatsAppNotificationQueue) return;
    const overdue = await prisma.whatsAppNotificationQueue.count({
      where: { status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - OVERDUE_THRESHOLD_MS) } },
    });
    if (overdue > OVERDUE_ALERT_AT) {
      console.error(`🚨 [NOTIF-QUEUE] ${overdue} notifications overdue (>2min) — check worker/Redis/META_CLOUD`);
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
 * محفّز (trigger) BullMQ — الـ Worker هنا فقط "يوقظ" المعالج الدوري
 * الذي يلتقط PENDING من WhatsAppNotificationQueue.
 * أبقينا processNotificationQueue كمصدر الحقيقة الوحيد (لا تكرار منطق).
 * الـ repeat job (كل دقيقة) يُدار بواسطة BullMQ/Redis، فلا يتكرر عبر
 * نسخ متعددة من الـ backend.
 */
function startNotificationQueueWorker() {
  if (started) return;

  if (!isRedisConfigured()) {
    console.warn('⚠️ [NOTIF-QUEUE] Redis غير مُعد — الطابور سيعمل بـ fallback polling');
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
    console.error(`❌ [NOTIF-QUEUE] Job ${job?.id} failed:`, err.message)
  );
  worker.on('error', (err) =>
    console.error(`❌ [NOTIF-QUEUE] Worker error:`, err.message)
  );

  // 🚨 PRODUCTION-FIX (near-real-time 5s): معالجة الطابور كل 5 ثوانٍ
  // يضمن وصول الإشعارات بشكل شبه فوري دون إرهاق قاعدة البيانات وقفل السجلات كل ثانية
  const queue = new Queue(QUEUE_NAME, { connection: redisConfig });
  queue
    .add(
      'process-pending',
      {},
      {
        repeat: { pattern: '*/5 * * * * *' },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    )
    .catch((e) => console.error('[NOTIF-QUEUE] schedule failed:', e.message));

  started = true;
  console.log('✅ [NOTIF-QUEUE] WhatsApp notification queue worker started');
}

/**
 * fallback: polling بسيط بدون Redis (يحاكي السلوك المقصود).
 * استخدم في البيئات بدون Redis فقط.
 */
function startFallbackPolling() {
  if (started) return;
  // Polling كل 5 ثوانٍ في وضع fallback
  fallbackTimer = setInterval(async () => {
    try {
      await runQueueTick();
    } catch (e) {
      console.error('[NOTIF-QUEUE] fallback tick failed:', e.message);
    }
  }, 5000);
  if (typeof fallbackTimer.unref === 'function') fallbackTimer.unref();
  started = true;
  console.log('✅ [NOTIF-QUEUE] Fallback polling started (5s)');
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
