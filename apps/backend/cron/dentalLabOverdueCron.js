const cron = require('node-cron');
const dentalNotificationService = require('../services/dentalLabNotificationService');

/**
 * جدولة دورية لفحص حالات معمل الأسنان المتأخرة
 * تعمل كل 6 ساعات للتحقق من أي حالات تجاوزت موعد التسليم
 * وتوليد إشعارات داخلية في المنصة وإشعارات واتساب للطبيب إن كانت مفعلة.
 */
function startDentalLabOverdueScheduler() {
  console.log('⏰ [DENTAL-LAB-OVERDUE-CRON] Initializing Dental Lab Overdue Cron Service...');

  // كل 6 ساعات (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ [DENTAL-LAB-OVERDUE-CRON] Running scheduled scan for overdue dental cases...');
    try {
      const result = await dentalNotificationService.scanOverdueCases(null);
      console.log(
        `✅ [DENTAL-LAB-OVERDUE-CRON] Scan complete. Scanned: ${result.scanned}, In-App: ${result.internalNotifsCreated || 0}, Sent: ${result.sent}, Skipped: ${result.skipped}, Failed: ${result.failed}`
      );
    } catch (error) {
      console.error('❌ [DENTAL-LAB-OVERDUE-CRON] Error during overdue scan:', error.message);
    }
  });
}

module.exports = { startDentalLabOverdueScheduler };
