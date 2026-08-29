const cron = require('node-cron');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const customerNotificationScheduleService = require('../services/hr/customerNotificationScheduleService');

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 Loyalty Points Expiry Processor + Customer Quality Notifications
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
            console.log('⏰ [Loyalty Scheduler] Processing expiry warnings...');
            const warningResult = await customerLoyaltyService.processExpiryWarnings();
            if (warningResult.success && warningResult.totalWarned > 0) {
                console.log(`✅ [Loyalty Scheduler] Sent ${warningResult.totalWarned} expiry warnings`);
            }

            console.log('⏰ [Loyalty Scheduler] Processing expired points...');
            const result = await customerLoyaltyService.processExpiredPoints();

            if (result.success && result.totalExpired > 0) {
                console.log(`✅ [Loyalty Scheduler] Expired points for ${result.totalExpired} records`);
            } else {
                console.log('ℹ️ [Loyalty Scheduler] No points expired today');
            }

            console.log('⏰ [Loyalty Scheduler] Checking customer quality changes...');
            const qualityResult = await customerNotificationScheduleService.processQualityChanges();
            if (qualityResult.success && qualityResult.totalChanged > 0) {
                console.log(`✅ [Loyalty Scheduler] Sent ${qualityResult.totalChanged} quality notifications`);
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
