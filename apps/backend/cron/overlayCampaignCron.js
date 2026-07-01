const cron = require('node-cron');
const overlayCampaignService = require('../services/overlayCampaignService');

let schedulerTask = null;
let isRunning = false;

const start = () => {
  if (schedulerTask) return schedulerTask;

  if (process.env.OVERLAY_CAMPAIGN_CRON === 'false') {
    console.log('ℹ️ [OVERLAY-CRON] Disabled by environment');
    return null;
  }

  schedulerTask = cron.schedule('0 */6 * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const expired = await overlayCampaignService.activateExpired();
      if (expired.length) {
        console.log(`✅ [OVERLAY-CRON] Expired ${expired.length} campaigns`);
      }

      const activated = await overlayCampaignService.activateScheduled();
      if (activated.length) {
        console.log(`✅ [OVERLAY-CRON] Activated ${activated.length} scheduled campaigns and synced to Facebook`);
      }
    } catch (error) {
      console.error('❌ [OVERLAY-CRON] Error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ [OVERLAY-CRON] Started (checks every 6 hours)');
  return schedulerTask;
};

const stop = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }
};

module.exports = { start, stop };
