const cron = require('node-cron');
const dentalNotificationService = require('../services/dentalLabNotificationService');
const { runGlobalDentalEscalation } = require('../services/dentalAssignmentService');

/**
 * Trigger escalation scan programmatically (testable & cluster-safe)
 */
async function triggerEscalationScan() {
  try {
    return await runGlobalDentalEscalation();
  } catch (error) {
    console.error('❌ [DENTAL-ESCALATION-CRON] Error during escalation scan:', error.message);
    return { executed: false, error: error.message };
  }
}

/**
 * جدولة دورية لفحص حالات معمل الأسنان المتأخرة وتصعيد المراحل تلقائيًا
 * 1. فحص حالات تجاوزت موعد التسليم وتوليد الإشعارات (كل 6 ساعات)
 * 2. فحص وتصعيد مراحل العمل المتأخرة وإعادة إسنادها وفق السياسات (كل ساعة، محمي بقفل الكلاستر)
 */
function startDentalLabOverdueScheduler() {
  console.log('⏰ [DENTAL-LAB-OVERDUE-CRON] Initializing Dental Lab Overdue Cron Service...');

  // 1. فحص مواعيد تسليم الحالات وإرسال التنبيهات كل 6 ساعات (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ [DENTAL-LAB-OVERDUE-CRON] Running scheduled scan for overdue dental cases...');
    try {
      const result = await dentalNotificationService.scanOverdueCases(null);
      console.log(
        `✅ [DENTAL-LAB-OVERDUE-CRON] Overdue cases scan complete. Scanned: ${result.scanned}, In-App: ${result.internalNotifsCreated || 0}, Sent: ${result.sent}, Skipped: ${result.skipped}, Failed: ${result.failed}`
      );
    } catch (error) {
      console.error('❌ [DENTAL-LAB-OVERDUE-CRON] Error during overdue scan:', error.message);
    }
  });

  // 2. فحص وتصعيد مراحل العمل المتأخرة تلقائيًا (كل ساعة)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [DENTAL-ESCALATION-CRON] Running scheduled stage escalation check...');
    await triggerEscalationScan();
  });
}

module.exports = {
  startDentalLabOverdueScheduler,
  triggerEscalationScan,
};
