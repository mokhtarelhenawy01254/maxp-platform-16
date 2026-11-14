let cron;
try {
  cron = require('node-cron');
} catch {
  cron = {
    schedule: () => ({ start: () => {}, stop: () => {} }),
  };
}
const taskEscalationService = require('../services/taskEscalationService');

const ESCALATION_CRON_EXPRESSION = '*/30 * * * *';
const DEAD_TASKS_CRON_EXPRESSION = '0 9 * * 1';

let isEscalationScanRunning = false;
let isDeadTasksScanRunning = false;

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
 * Start task escalation scheduler (every 30 minutes Africa/Cairo).
 */
function startTaskEscalationScheduler() {
  console.log('⏰ [TASK-ESCALATION-CRON] Initializing Task Escalation Cron (every 30 mins Africa/Cairo)...');

  const task = cron.schedule(
    ESCALATION_CRON_EXPRESSION,
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

/**
 * Execute weekly dead tasks report sweep.
 * Callable directly in tests without waiting for the cron schedule.
 * @param {Object} [options]
 * @param {string} [options.companyId]
 * @param {Date|string} [options.now]
 * @param {number} [options.windowDays]
 * @param {Object} [options.prisma]
 */
async function triggerDeadTasksReportScan(options = {}) {
  if (isDeadTasksScanRunning && !options.prisma) {
    console.warn('⚠️ [TASK-ESCALATION-CRON] Previous dead tasks scan still running, skipping overlapping trigger.');
    return { skippedOverlap: true, companies: [], totals: { total: 0, extend: 0, reassign: 0, cancel: 0 } };
  }

  isDeadTasksScanRunning = true;
  try {
    const summary = await taskEscalationService.runWeeklyDeadTasksReport(options);
    console.log(
      `✅ [TASK-ESCALATION-CRON] Weekly dead tasks report complete: companies=${summary?.companies?.length || 0}`
    );
    return summary;
  } catch (error) {
    console.error('❌ [TASK-ESCALATION-CRON] Error during dead tasks report scan:', error);
    throw error;
  } finally {
    isDeadTasksScanRunning = false;
  }
}

/**
 * Start weekly dead tasks report scheduler (Mondays 09:00 Africa/Cairo).
 */
function startDeadTasksReportScheduler() {
  console.log('⏰ [TASK-ESCALATION-CRON] Initializing Weekly Dead Tasks Report Cron (Mondays 09:00 Africa/Cairo)...');

  const task = cron.schedule(
    DEAD_TASKS_CRON_EXPRESSION,
    async () => {
      try {
        await triggerDeadTasksReportScan();
      } catch (_) {
        // Error already logged inside triggerDeadTasksReportScan
      }
    },
    {
      timezone: 'Africa/Cairo',
    }
  );

  return task;
}

module.exports = {
  ESCALATION_CRON_EXPRESSION,
  DEAD_TASKS_CRON_EXPRESSION,
  startTaskEscalationScheduler,
  triggerEscalationScan,
  startDeadTasksReportScheduler,
  triggerDeadTasksReportScan,
};
