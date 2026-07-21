const { getSharedPrismaClient } = require('./sharedDatabase');

class SyncQueueService {
    constructor() {
        this.prisma = getSharedPrismaClient();
        this.processing = false;
    }

    async enqueue(orderId, consumerId) {
        try {
            const existing = await this.prisma.$queryRawUnsafe(
                `SELECT id, status FROM order_sync_queue WHERE order_id = $1 AND status IN ('PENDING','PROCESSING','FAILED') LIMIT 1`,
                [orderId]
            );
            if (existing.length > 0) {
                console.log(`⏭️ [SYNC-QUEUE] Order ${orderId} already queued (${existing[0].status}), skipping`);
                return;
            }
            const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await this.prisma.$executeRawUnsafe(
                `INSERT INTO order_sync_queue (id, order_id, consumer_id, status, max_attempts, created_at, updated_at) VALUES ($1, $2, $3, 'PENDING', 10, NOW(), NOW())`,
                [id, orderId, consumerId]
            );
            console.log(`📝 [SYNC-QUEUE] Enqueued order ${orderId} for consumer ${consumerId}`);
        } catch (error) {
            console.error('❌ [SYNC-QUEUE] Enqueue error:', error.message);
        }
    }

    async processBatch(batchSize = 5) {
        if (this.processing) { console.log('⏳ [SYNC-QUEUE] Already processing'); return; }
        this.processing = true;
        try {
            const items = await this.prisma.$queryRawUnsafe(
                `SELECT id, order_id, consumer_id, attempts, max_attempts FROM order_sync_queue 
                 WHERE status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= NOW()) AND attempts < max_attempts 
                 ORDER BY created_at ASC LIMIT $1`, [batchSize]
            );
            if (items.length === 0) { this.processing = false; return; }
            console.log(`🔄 [SYNC-QUEUE] Processing ${items.length} items`);

            const internalSyncService = require('./internalSyncService');
            for (const item of items) {
                try {
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE order_sync_queue SET status = 'PROCESSING', attempts = attempts + 1, updated_at = NOW() WHERE id = $1`, [item.id]
                    );
                    await internalSyncService.pushOrderToProvider(item.order_id, item.consumer_id);
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE order_sync_queue SET status = 'COMPLETED', last_error = NULL, next_retry_at = NULL, updated_at = NOW() WHERE id = $1`, [item.id]
                    );
                    console.log(`✅ [SYNC-QUEUE] Completed: ${item.order_id}`);
                } catch (error) {
                    const [result] = await this.prisma.$queryRawUnsafe(
                        `SELECT attempts, max_attempts FROM order_sync_queue WHERE id = $1`, [item.id]
                    );
                    const newAttempts = result.attempts;
                    const failed = newAttempts >= result.max_attempts;
                    const backoff = Math.min(Math.pow(2, newAttempts) * 10, 3600);
                    console.error(`❌ [SYNC-QUEUE] ${failed ? 'FAILED' : 'Retrying'} ${item.order_id} (${newAttempts}/${result.max_attempts}): ${error.message}`);
                    await this.prisma.$executeRawUnsafe(
                        `UPDATE order_sync_queue SET status = $1, last_error = $2, next_retry_at = $3, updated_at = NOW() WHERE id = $4`,
                        [failed ? 'FAILED' : 'PENDING', (error.message || 'Unknown error').slice(0, 500), failed ? null : new Date(Date.now() + backoff * 1000), item.id]
                    );
                }
            }
        } catch (error) {
            console.error('❌ [SYNC-QUEUE] Batch error:', error.message);
        } finally {
            this.processing = false;
        }
    }

    async getStatus(orderId) {
        return this.prisma.$queryRawUnsafe(
            `SELECT id, status, attempts, last_error, created_at FROM order_sync_queue WHERE order_id = $1 ORDER BY created_at DESC LIMIT 5`, [orderId]
        );
    }
}

module.exports = new SyncQueueService();
