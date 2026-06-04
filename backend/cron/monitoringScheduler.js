const cron = require('node-cron');
const { captureQueueMetrics } = require('../services/monitoringService');

/**
 * Initialize and start the monitoring scheduler
 */
function startMonitoringScheduler() {
    console.log('🕒 [MONITORING-CRON] Starting monitoring scheduler...');

    // Run every 15 minutes
    // Time format: '*/15 * * * *' (minute, hour, day, month, day of week)
    cron.schedule('*/15 * * * *', async () => {
        try {
            await captureQueueMetrics();
        } catch (error) {
            console.error('❌ [MONITORING-CRON] Scheduled task failed:', error.message);
        }
    });

    // Run once on startup to have initial data
    captureQueueMetrics().catch(err => {
        console.error('⚠️ [MONITORING-CRON] Initial capture failed:', err.message);
    });

    console.log('✅ [MONITORING-CRON] Monitoring scheduler started (runs every 15 minutes)');
}

module.exports = {
    startMonitoringScheduler
};
