const { getSharedPrismaClient } = require('./sharedDatabase');

class SyncQueueService {
    constructor() {
        this.prisma = getSharedPrismaClient();
        this.processing = false;
    }

    async enqueue(orderId, consumerId) {
        try {
            const existing = await this.prisma.orderSyncQueue.findFirst({
                where: {
                    orderId,
                    status: { in: ['PENDING', 'PROCESSING', 'FAILED'] }
                },
                select: { id: true, status: true }
            });
            if (existing) {
                console.log(`⏭️ [SYNC-QUEUE] Order ${orderId} already queued (${existing.status}), skipping`);
                return;
            }
            const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await this.prisma.orderSyncQueue.create({
                data: {
                    id,
                    orderId,
                    consumerId,
                    status: 'PENDING',
                    maxAttempts: 10
                }
            });
            console.log(`📝 [SYNC-QUEUE] Enqueued order ${orderId} for consumer ${consumerId}`);
        } catch (error) {
            console.error('❌ [SYNC-QUEUE] Enqueue error:', error.message);
        }
    }

    async processBatch(batchSize = 5) {
        if (this.processing) { console.log('⏳ [SYNC-QUEUE] Already processing'); return; }
        this.processing = true;
        try {
            const items = await this.prisma.orderSyncQueue.findMany({
                where: {
                    status: 'PENDING',
                    OR: [
                        { nextRetryAt: null },
                        { nextRetryAt: { lte: new Date() } }
                    ]
                },
                orderBy: { createdAt: 'asc' },
                take: batchSize
            });
            
            // Filter in-memory for attempts < maxAttempts just in case (though status=PENDING should guarantee it)
            const sendableItems = items.filter(item => item.attempts < item.maxAttempts);
            if (sendableItems.length === 0) { this.processing = false; return; }
            console.log(`🔄 [SYNC-QUEUE] Processing ${sendableItems.length} items`);

            const internalSyncService = require('./internalSyncService');
            for (const item of sendableItems) {
                try {
                    await this.prisma.orderSyncQueue.update({
                        where: { id: item.id },
                        data: {
                            status: 'PROCESSING',
                            attempts: { increment: 1 }
                        }
                    });
                    
                    // We call the push logic
                    await internalSyncService.pushOrderToProvider(item.orderId, item.consumerId);
                    
                    await this.prisma.orderSyncQueue.update({
                        where: { id: item.id },
                        data: {
                            status: 'COMPLETED',
                            lastError: null,
                            nextRetryAt: null
                        }
                    });
                    console.log(`✅ [SYNC-QUEUE] Completed: ${item.orderId}`);
                } catch (error) {
                    // Refetch the item to get current attempts and maxAttempts (in case of changes)
                    const updatedItem = await this.prisma.orderSyncQueue.findUnique({
                        where: { id: item.id },
                        select: { attempts: true, maxAttempts: true }
                    });
                    
                    if (!updatedItem) {
                        console.error(`❌ [SYNC-QUEUE] Item ${item.id} not found during error handling`);
                        continue;
                    }
                    
                    const newAttempts = updatedItem.attempts;
                    const failed = newAttempts >= updatedItem.maxAttempts;
                    const backoff = Math.min(Math.pow(2, newAttempts) * 10, 3600);
                    console.error(`❌ [SYNC-QUEUE] ${failed ? 'FAILED' : 'Retrying'} ${item.orderId} (${newAttempts}/${updatedItem.maxAttempts}): ${error.message}`);
                    
                    await this.prisma.orderSyncQueue.update({
                        where: { id: item.id },
                        data: {
                            status: failed ? 'FAILED' : 'PENDING',
                            lastError: (error.message || 'Unknown error').slice(0, 500),
                            nextRetryAt: failed ? null : new Date(Date.now() + backoff * 1000)
                        }
                    });
                }
            }
        } catch (error) {
            console.error('❌ [SYNC-QUEUE] Batch error:', error.message);
        } finally {
            this.processing = false;
        }
    }

    async getStatus(orderId) {
        return this.prisma.orderSyncQueue.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
    }
}

module.exports = new SyncQueueService();
