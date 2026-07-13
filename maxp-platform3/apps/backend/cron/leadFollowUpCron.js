const cron = require('node-cron');
const leadFollowUpService = require('../services/whatsapp/LeadFollowUpService');

function startLeadFollowUpScheduler() {
    console.log('[LEAD-FOLLOWUP-CRON] Initializing Lead Follow-Up Service...');

    cron.schedule('*/15 * * * *', async () => {
        console.log('[LEAD-FOLLOWUP-CRON] Checking for pending lead follow-up messages...');
        try {
            await leadFollowUpService.processPendingEnrollments();
            console.log('[LEAD-FOLLOWUP-CRON] Batch processing completed.');
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CRON] Error during processing batch:', error);
        }
    });

    console.log('[LEAD-FOLLOWUP-CRON] Lead follow-up scheduler started (runs every 15 minutes)');
}

module.exports = { startLeadFollowUpScheduler };
