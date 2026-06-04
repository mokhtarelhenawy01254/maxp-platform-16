const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { webhookQueue } = require('../queues/webhookQueue');

/**
 * Capture current queue statistics and save to historical log
 */
async function captureQueueMetrics() {
    try {
        console.log('📊 [MONITORING] Capturing queue metrics...');

        // 1. Get current counts from BullMQ
        if (!webhookQueue) {
            console.warn('⚠️ [MONITORING] Webhook queue not initialized (Redis disabled)');
            return;
        }
        const counts = await webhookQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed', 'paused');

        // 2. Save to database using safeQuery
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.queueMetric.create({
                data: {
                    active: counts.active || 0,
                    waiting: counts.waiting || 0,
                    completed: counts.completed || 0,
                    failed: counts.failed || 0,
                    delayed: counts.delayed || 0,
                    paused: counts.paused || 0,
                    timestamp: new Date()
                }
            });
        }, 3);

        console.log('✅ [MONITORING] Queue metrics saved successfully');
    } catch (error) {
        console.error('❌ [MONITORING] Failed to capture queue metrics:', error.message);
    }
}

/**
 * Get historical metrics for a specific period
 */
async function getHistoricalMetrics(days = 7) {
    try {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        return await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.queueMetric.findMany({
                where: {
                    timestamp: { gte: dateFrom }
                },
                orderBy: {
                    timestamp: 'asc'
                }
            });
        }, 1);
    } catch (error) {
        console.error('❌ [MONITORING] Failed to fetch historical metrics:', error.message);
        return [];
    }
}

module.exports = {
    captureQueueMetrics,
    getHistoricalMetrics
};
