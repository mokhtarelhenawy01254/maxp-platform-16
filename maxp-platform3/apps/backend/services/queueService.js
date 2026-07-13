/**
 * 🚀 Queue Service (BullMQ)
 * 
 * Manages background job queues for async processing (logging, analytics, etc.)
 */

const redisConfig = require('../config/redis');
const crypto = require('crypto');

function getDefaultQueue() {
    return require('bullmq').Queue;
}

function normalizeBullJobId(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const raw = String(value);
    const safe = raw
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 140);

    if (safe && safe === raw) {
        return safe;
    }

    const digest = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
    return `${safe || 'job'}__${digest}`;
}

class QueueService {
    constructor(options = {}) {
        this.queues = new Map();
        this.Queue = options.Queue || null;

        // Check if Redis is configured
        const env = options.env || process.env;
        const configuredRedis = options.redisConfig === undefined ? redisConfig : options.redisConfig;
        const isRedisConfigured = env.REDIS_URL ||
            (env.REDIS_HOST && env.REDIS_HOST !== 'production-redis-host') ||
            Boolean(options.redisConfig);

        if (!isRedisConfigured && env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
            console.warn('⚠️ [QUEUE] Redis not configured - Queue features disabled');
            this.redisConfig = null;
            return;
        }

        if (!configuredRedis) {
            if (env.NODE_ENV !== 'test') {
                console.warn('⚠️ [QUEUE] Redis config is null - Queue features disabled');
            }
            this.redisConfig = null;
            return;
        }

        this.redisConfig = {
            connection: configuredRedis
        };
        this.Queue = this.Queue || getDefaultQueue();

        // Initialize Log Queue
        if (options.autoInitialize !== false) {
            this.createQueue('ai-logs');
        }
    }

    /**
     * Create or retrieve a queue
     */
    createQueue(queueName) {
        if (!this.redisConfig) return null;
        if (this.queues.has(queueName)) {
            return this.queues.get(queueName);
        }

        console.log(`📥 [QUEUE] Initializing queue: ${queueName}`);
        const queue = new this.Queue(queueName, this.redisConfig);

        // Error handling
        queue.on('error', (err) => {
            console.error(`❌ [QUEUE] Error in ${queueName}:`, err.message);
        });

        this.queues.set(queueName, queue);
        return queue;
    }

    /**
     * Add job to queue
     * Fire-and-forget style (mostly)
     */
    buildJobOptions(options = {}) {
        const { idempotencyKey, ...bullOptions } = options;
        const rawJobId = bullOptions.jobId || idempotencyKey || null;
        const normalizedJobId = normalizeBullJobId(rawJobId);
        return {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true, // Auto-cleanup
            removeOnFail: 100, // Keep last 100 failed for debugging
            ...bullOptions,
            ...(normalizedJobId ? { jobId: normalizedJobId } : {})
        };
    }

    async add(queueName, jobName, data, options = {}) {
        if (!this.redisConfig) return null;
        try {
            const queue = this.createQueue(queueName);
            if (!queue) return null;

            const jobOptions = this.buildJobOptions(options);
            return await queue.add(jobName, data, jobOptions);
        } catch (error) {
            console.error(`❌ [QUEUE] Failed to add job to ${queueName}:`, error.message);
            return null;
        }
    }

    /**
     * Close all queues (cleanup)
     */
    async close() {
        for (const [name, queue] of this.queues) {
            await queue.close();
        }
        this.queues.clear();
    }
}

// Singleton
const queueService = new QueueService();
module.exports = queueService;
module.exports.QueueService = QueueService;
module.exports.normalizeBullJobId = normalizeBullJobId;
