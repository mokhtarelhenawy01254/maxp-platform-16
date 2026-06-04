const cron = require('node-cron');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 Loyalty Points Expiry Processor
// ═══════════════════════════════════════════════════════════════════════════════

let loyaltySchedulerTask = null;

/**
 * تشغيل مهمة معالجة النقاط المنتهية يومياً الساعة 2 صباحاً
 */
function startLoyaltyExpiryScheduler() {
    if (loyaltySchedulerTask) {
        console.log('⚠️ [Loyalty Scheduler] Already running');
        return;
    }

    // Run every day at 02:00 AM
    loyaltySchedulerTask = cron.schedule('0 2 * * *', async () => {
        try {
            console.log('⏰ [Loyalty Scheduler] Processing expired points...');
            const result = await customerLoyaltyService.processExpiredPoints();

            if (result.success && result.totalExpired > 0) {
                console.log(`✅ [Loyalty Scheduler] Expired points for ${result.totalExpired} records`);
            } else {
                console.log('ℹ️ [Loyalty Scheduler] No points expired today');
            }
        } catch (error) {
            console.error('❌ [Loyalty Scheduler] Error:', error);
        }
    });

    console.log('✅ [Loyalty Scheduler] Started - Running daily at 02:00 AM');
}

function stopLoyaltyExpiryScheduler() {
    if (loyaltySchedulerTask) {
        loyaltySchedulerTask.stop();
        loyaltySchedulerTask = null;
        console.log('🛑 [Loyalty Scheduler] Stopped');
    }
}

module.exports = {
    startLoyaltyExpiryScheduler,
    stopLoyaltyExpiryScheduler
};
