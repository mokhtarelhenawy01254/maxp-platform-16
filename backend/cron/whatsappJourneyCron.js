const cron = require('node-cron');
const whatsappJourneyService = require('../services/whatsapp/WhatsAppJourneyService');

/**
 * WhatsApp Journey Automation Scheduler
 * Runs periodically to check and send scheduled follow-up messages
 */
function startWhatsAppJourneyScheduler() {
    console.log('🚀 [JOURNEY-CRON] Initializing WhatsApp Journey Service...');

    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('🕒 [JOURNEY-CRON] Checking for pending follow-up messages...');
        try {
            await whatsappJourneyService.processPendingJourneys();
            console.log('✅ [JOURNEY-CRON] Batch processing completed.');
        } catch (error) {
            console.error('❌ [JOURNEY-CRON] Error during processing batch:', error);
        }
    });

    console.log('✅ [JOURNEY-CRON] WhatsApp Journey scheduler started (runs every 30 minutes)');
}

module.exports = { startWhatsAppJourneyScheduler };
