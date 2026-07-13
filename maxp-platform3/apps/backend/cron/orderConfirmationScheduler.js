const cron = require('node-cron');
const orderConfirmationService = require('../services/orderConfirmationService');
const { safeQuery } = require('../services/sharedDatabase');

let isRunning = false;
const CONCURRENCY_LIMIT = 5;

const runWithConcurrency = async (items, limit, handler) => {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => (
    (async () => {
      while (index < items.length) {
        const current = items[index++];
        await handler(current);
      }
    })()
  ));
  await Promise.all(workers);
};

async function runOrderConfirmationNotifications() {
  if (isRunning) {
    console.log('[ORDER-CONFIRMATION-CRON] Previous run still active, skipping.');
    return;
  }

  isRunning = true;
  try {
    const settingsList = await safeQuery(
      (prisma) => prisma.orderConfirmationSettings.findMany({
        where: { enabled: true, notifyOnNew: true },
        select: {
          companyId: true,
          requireSourceTypes: true,
          requireStatuses: true,
          confirmStatus: true,
          eligibleRoles: true,
          eligibleUserIds: true,
          regionRules: true,
          specialtyRules: true,
          workloadStatuses: true,
          notifyOnNew: true
        }
      }),
      1
    );

    await runWithConcurrency(settingsList, CONCURRENCY_LIMIT, async (settings) => {
      try {
        const normalized = orderConfirmationService.normalizeSettings(settings);
        await orderConfirmationService.notifyNewQueue(settings.companyId, normalized);
      } catch (error) {
        console.error(`[ORDER-CONFIRMATION-CRON] Failed for company ${settings.companyId}:`, error.message);
      }
    });
  } catch (error) {
    console.error('[ORDER-CONFIRMATION-CRON] Job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startOrderConfirmationScheduler() {
  console.log('[ORDER-CONFIRMATION-CRON] Starting order confirmation scheduler...');

  cron.schedule('*/5 * * * *', runOrderConfirmationNotifications);

  setTimeout(() => {
    runOrderConfirmationNotifications().catch((error) => {
      console.error('[ORDER-CONFIRMATION-CRON] Initial run failed:', error.message);
    });
  }, 2 * 60 * 1000);

  console.log('[ORDER-CONFIRMATION-CRON] Order confirmation scheduler started (runs every 5 minutes)');
}

module.exports = {
  startOrderConfirmationScheduler
};
