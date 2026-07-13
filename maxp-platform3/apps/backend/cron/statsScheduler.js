const cron = require('node-cron');
const { runAggregation, cleanupOldStats } = require('../services/statisticsService');

/**
 * Initialize and start the stats periodic tasks
 */
function startStatsScheduler() {
    console.log('🕒 [STATS-CRON] Starting statistics scheduler...');

    // Run every 3 hours
    // This ensures data is up-to-date and recovers quickly from server restarts
    cron.schedule('0 */3 * * *', async () => {
        console.log('📊 [STATS-CRON] Starting periodic stats maintenance job...');
        try {
            // Run aggregation for the last 3 days to ensure self-healing of any missing data
            console.log('📈 [STATS-CRON] Running optimized aggregation (Self-healing mode: 3 days)...');
            await runAggregation(3);

            // Cleanup old raw stats (older than 2 days) to keep main tables light
            console.log('🧹 [STATS-CRON] Running cleanup...');
            await cleanupOldStats(2);

            console.log('✅ [STATS-CRON] Periodic stats maintenance job completed.');
        } catch (error) {
            console.error('❌ [STATS-CRON] Maintenance job failed:', error);
        }
    });

    console.log('✅ [STATS-CRON] Statistics scheduler started (runs every 3 hours)');
}

module.exports = {
    startStatsScheduler
};
