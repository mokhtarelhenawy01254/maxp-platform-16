/**
 * 📥 Webhook Queue
 * 
 * Persistent queue for processing incoming webhooks (Facebook, etc.)
 * uses Redis/BullMQ for reliability across multiple server instances.
 */

const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

// Initialize the queue
const webhookQueue = redisConfig ? new Queue('webhook-processing', {
    connection: redisConfig
}) : null;

/**
 * Add a webhook event to the processing queue
 */
async function addWebhookJob(type, data) {
    if (!webhookQueue) {
        // console.warn('⚠️ [WEBHOOK-QUEUE] Queue not initialized (Redis disabled)');
        return;
    }
    try {
        await webhookQueue.add(type, data, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 1000 } // Keep failed jobs for debugging
        });
        // console.log(`📥 [WEBHOOK-QUEUE] Job added: ${type}`);
    } catch (error) {
        console.error(`❌ [WEBHOOK-QUEUE] Failed to add job:`, error.message);
        // Fallback or critical error handling
    }
}

module.exports = {
    webhookQueue,
    addWebhookJob
};
