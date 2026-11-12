const cron = require('node-cron');
const taskEscalationService = require('../services/taskEscalationService');

let isEscalationScanRunning = false;

/**
 * Execute an overdue task escalation sweep.
 * Callable directly in tests without waiting for the cron schedule.
 * @param {Object} [options]
 * @param {string} [options.companyId]
 * @param {Date|string} [options.now]
 * @param {Object} [options.prisma]
 */
async function triggerEscalationScan(options = {}) {
  if (isEscalationScanRunning && !options.prisma) {
    console.warn('⚠️ [TASK-ESCALATION-CRON] Previous scan still running, skipping overlapping trigger.');
    return { skippedOverlap: true, scanned: 0, escalated: 0, results: [] };
  }

  isEscalationScanRunning = true;
  try {
    const summary = await taskEscalationService.runEscalationSweep(options);
    console.log(
      `✅ [TASK-ESCALATION-CRON] Sweep complete: scanned=${summary.scanned}, escalated=${summary.escalated}`
    );
    return summary;
  } catch (error) {
    console.error('❌ [TASK-ESCALATION-CRON] Error during escalation scan:', error);
    throw error;
  } finally {
    isEscalationScanRunning = false;
  }
}

/**
 * Start daily 09:00 Africa/Cairo task escalation scheduler.
 */
function startTaskEscalationScheduler() {
  console.log('⏰ [TASK-ESCALATION-CRON] Initializing Task Escalation Cron (09:00 Africa/Cairo)...');

  const task = cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        await triggerEscalationScan();
      } catch (_) {
        // Error already logged inside triggerEscalationScan
      }
    },
    {
      timezone: 'Africa/Cairo',
    }
  );

  return task;
}

module.exports = {
  startTaskEscalationScheduler,
  triggerEscalationScan,
};
