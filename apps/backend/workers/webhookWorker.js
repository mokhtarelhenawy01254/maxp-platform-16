/**
 * 👷 Webhook Worker
 * 
 * background process that consumes webhook events from the queue
 * and performs heavy processing outside the request path.
 */

function installWorkerProductionLogFilter() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    try {
        const { installProductionLogFilter } = require('../utils/installProductionLogFilter');
        installProductionLogFilter();
    } catch (error) {
        console.warn('[WEBHOOK-WORKER] Production log filter unavailable:', error.message);
    }
}

installWorkerProductionLogFilter();

const { Worker } = require('bullmq');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const redisConfig = require('../config/redis');
const { processFacebookMessage, processFacebookComment, processReadReceipt } = require('../services/webhookService');
const { syncTurboStatusToOrder } = require('../services/turboStatusSyncService');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

/**
 * Initialize the Worker
 */
function startWebhookWorker() {
    if (!redisConfig) {
        console.warn('⚠️ [WEBHOOK-WORKER] Redis config is missing, worker will not start.');
        return null;
    }

    console.log('👷 [WEBHOOK-WORKER] Starting BullMQ worker...');

    const worker = new Worker('webhook-processing', async (job) => {
        const { data } = job;
        const startTime = Date.now();

        try {
            // Ensure DB connection is ready
            await getSharedPrismaClientAsync();

            switch (job.name) {
                case 'facebook-message':
                    // console.log(`👷 [WORKER] Processing Facebook message: ${data.mid || 'unknown'}`);
                    await processFacebookMessage(data);
                    break;

                case 'facebook-comment':
                    // console.log(`👷 [WORKER] Processing Facebook comment: ${data.comment_id || 'unknown'}`);
                    await processFacebookComment(data);
                    break;

                case 'facebook-read-receipt':
                    // console.log(`👷 [WORKER] Processing Facebook read receipt`);
                    await processReadReceipt(data);
                    break;

                case 'turbo-status-update':
                    console.log(`👷 [WORKER] Processing Turbo status update for ${data.orderNumber || data.turboShipmentId}...`);
                    await syncTurboStatusToOrder({
                        orderId: data.orderId,
                        orderNumber: data.orderNumber,
                        companyId: data.companyId,
                        rawStatus: data.rawStatus,
                        payload: data.payload,
                        isGuestOrder: data.isGuestOrder || false
                    });
                    console.log(`✅ [WORKER] Turbo status update complete for ${data.orderNumber || data.turboShipmentId}`);
                    break;

                default:
                    console.warn(`⚠️ [WORKER] Unknown job type: ${job.name}`);
            }

            const duration = Date.now() - startTime;
            // console.log(`✅ [WORKER] Job ${job.id} (${job.name}) completed in ${duration}ms`);
        } catch (error) {
            console.error(`❌ [WORKER] Job ${job.id} failed:`, error.message);
            throw error;
        }
    }, {
        connection: redisConfig,
        concurrency: 20,
        limiter: {
            max: 1000,
            duration: 1000
        }
    });

    worker.on('error', err => {
        console.error('❌ [WEBHOOK-WORKER] Fatal error:', err);
    });

    return worker;
}

// Start if executed directly
if (require.main === module) {
    startWebhookWorker();

    // ⏰ Proactive stale-order alerts (WISMO defense — notify the merchant
    // when orders sit 48h+ in an active status).
    try {
        const { startStaleOrderAlertLoop } = require('../services/staleOrderAlertService');
        startStaleOrderAlertLoop();
    } catch (err) {
        console.warn(`⏰ [STALE-ORDERS] loop unavailable: ${err.message}`);
    }
}

module.exports = { startWebhookWorker };
