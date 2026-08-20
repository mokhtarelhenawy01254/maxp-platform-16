/**
 * Turbo Webhook Queue
 * ┘è╪╢┘à┘å retry ┘ä┘ä┘Ç webhooks ┘ä┘ê sync ┘ü╪┤┘ä
 */
const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

let queue = null;

function getQueue() {
  if (!queue && redisConfig) {
    queue = new Queue('webhook-processing', {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });
  }
  return queue;
}

async function addTurboWebhook(jobData) {
  const q = getQueue();
  if (!q) {
    console.warn('ΓÜá∩╕Å [TURBO-WEBHOOK-QUEUE] Redis not configured, processing synchronously');
    return null;
  }
  return q.add('turbo-status-update', jobData, {
    jobId: `turbo-${jobData.turboShipmentId}-${Date.now()}`,
    removeOnComplete: true,
    removeOnFail: false
  });
}

module.exports = { getQueue, addTurboWebhook };
