const cron = require('node-cron');
const scheduledOrderService = require('../services/scheduledOrderService');

let isRunning = false;

async function runScheduledOrderTransition() {
  if (isRunning) {
    console.log('[SCHEDULED-ORDER-CRON] Previous run still active, skipping.');
    return;
  }

  isRunning = true;
  try {
    console.log('[SCHEDULED-ORDER-CRON] Checking scheduled orders for auto-transition...');
    const result = await scheduledOrderService.checkAndTransitionScheduledOrders();
    console.log(`[SCHEDULED-ORDER-CRON] Completed. Processed ${result.processed} orders.`);
  } catch (error) {
    console.error('[SCHEDULED-ORDER-CRON] Job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startScheduledOrderCron() {
  console.log('[SCHEDULED-ORDER-CRON] Starting scheduled order cron...');

  cron.schedule('0 */12 * * *', runScheduledOrderTransition);

  setTimeout(() => {
    runScheduledOrderTransition().catch((error) => {
      console.error('[SCHEDULED-ORDER-CRON] Initial run failed:', error.message);
    });
  }, 3 * 60 * 1000);

  console.log('[SCHEDULED-ORDER-CRON] Scheduled order cron started (runs every 12 hours)');
}

module.exports = { startScheduledOrderCron };