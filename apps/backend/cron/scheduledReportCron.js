/**
 * ⏰ Scheduled WhatsApp Report Cron
 * جدولة وتشغيل إرسال تقارير المبيعات والعمليات الدورية عبر الواتساب
 */

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const periodicReportService = require('../services/whatsapp/periodicReportService');
const { formatInTimeZone } = require('date-fns-tz');

let schedulerTask = null;
let isTickRunning = false;

function startScheduledReportCron() {
  if (schedulerTask) {
    return schedulerTask;
  }

  if (process.env.SCHEDULED_WHATSAPP_REPORT_CRON === 'false') {
    console.log('ℹ️ [SCHEDULED-REPORT-CRON] Disabled by environment');
    return null;
  }

  // الفحص الدوري كل 15 دقيقة
  schedulerTask = cron.schedule('*/15 * * * *', async () => {
    if (isTickRunning) {
      console.log('⚠️ [SCHEDULED-REPORT-CRON] Previous run still in progress, skipping tick');
      return;
    }

    isTickRunning = true;

    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();

      const configs = await safeQuery(() => prisma.whatsAppScheduledReport.findMany({
        where: { isEnabled: true },
        include: {
          company: {
            select: { id: true, name: true, timezone: true }
          }
        }
      })) || [];

      if (configs.length === 0) {
        return;
      }

      for (const config of configs) {
        const timeZone = config.company?.timezone || 'Africa/Cairo';
        const todayStr = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

        // حماية منع التكرار: إذا تم الإرسال بالفعل اليوم
        if (config.lastSentAt) {
          const lastSentDayStr = formatInTimeZone(config.lastSentAt, timeZone, 'yyyy-MM-dd');
          if (lastSentDayStr === todayStr) {
            continue;
          }
        }

        // فحص يوم الأسبوع في حال كان التقرير أسبوعياً
        if (config.frequency === 'WEEKLY') {
          const currentDayOfWeek = formatInTimeZone(now, timeZone, 'i'); // 1 (Mon) - 7 (Sun)
          if (config.daysOfWeek && config.daysOfWeek !== 'ALL') {
            const allowedDays = config.daysOfWeek.split(',').map(d => d.trim());
            if (!allowedDays.includes(currentDayOfWeek)) {
              continue;
            }
          }
        }

        // فحص مطابقة الوقت الحالي مع وقت الإرسال المجدول
        const [targetHour, targetMin] = (config.sendTime || '21:00').split(':').map(Number);
        const currentHour = Number(formatInTimeZone(now, timeZone, 'H'));
        const currentMin = Number(formatInTimeZone(now, timeZone, 'm'));

        const targetTotalMinutes = targetHour * 60 + targetMin;
        const currentTotalMinutes = currentHour * 60 + currentMin;
        const diffMinutes = currentTotalMinutes - targetTotalMinutes;

        // تنفيذ الإرسال إذا كنا في نافذة الـ 20 دقيقة بعد الموعد المحدد
        if (diffMinutes >= 0 && diffMinutes < 20) {
          console.log(`⏰ [SCHEDULED-REPORT-CRON] Triggering scheduled report for ${config.company?.name || config.companyId} (Config: ${config.id})...`);
          try {
            const result = await periodicReportService.dispatchScheduledReport(config.id);
            if (result.success) {
              console.log(`✅ [SCHEDULED-REPORT-CRON] Report successfully delivered to ${result.deliveredCount} recipients`);
            } else {
              console.warn(`⚠️ [SCHEDULED-REPORT-CRON] Report delivery finished with issues:`, result.reason || result.error);
            }
          } catch (dispatchErr) {
            console.error(`❌ [SCHEDULED-REPORT-CRON] Failed to dispatch report for config ${config.id}:`, dispatchErr.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ [SCHEDULED-REPORT-CRON] Error during scheduler tick:', error.message);
    } finally {
      isTickRunning = false;
    }
  });

  console.log('✅ [SCHEDULED-REPORT-CRON] Periodic report scheduler started (runs every 15 minutes)');
  return schedulerTask;
}

function stopScheduledReportCron() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('🛑 [SCHEDULED-REPORT-CRON] Periodic report scheduler stopped');
  }
}

module.exports = {
  startScheduledReportCron,
  stopScheduledReportCron
};
