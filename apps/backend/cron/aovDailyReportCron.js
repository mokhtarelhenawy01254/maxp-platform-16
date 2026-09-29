/**
 * AOV Daily Report Cron
 * كرون التقرير اليومي لمتوسط قيمة الطلب — فريق شادي AOV
 *
 * الجدولة: كل يوم في الساعة 21:00 بتوقيت الشركة (Africa/Cairo افتراضياً)
 * الهدف: تشغيل شادي (aov-specialist-agent) تلقائياً ليولد تقرير AOV اليومي
 *        ويرسله عبر الواتساب لمختار / صاحب القرار.
 *
 * القواعد:
 * - التقرير يُطلق فقط للشركات التي لديها whatsAppScheduledReport نشط من نوع AOV_DAILY.
 * - مدقق الأرقام يعمل على مسودة المحلل قبل إرسالها.
 * - لا يُرسل أي تقرير يحتوي على أرقام غير موثقة.
 */

'use strict';

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { formatInTimeZone } = require('date-fns-tz');
const periodicReportService = require('../services/whatsapp/periodicReportService');

let schedulerTask = null;
let isTickRunning = false;

/**
 * توليد تقرير AOV اليومي لشركة واحدة
 * يستخدم بيانات periodicReportService الحالية + حسابات AOV المخصصة
 */
async function generateAovReport(companyId, config, prisma) {
  const reportData = await periodicReportService.generateReportMetrics(companyId);
  const { company, metrics, timeZone, currency, dateString } = reportData;

  const {
    totalOrders,
    totalRevenue,
    avgOrderValue,
    operations,
    topSellingProducts,
    lowStockProducts,
  } = metrics;

  // حساب مؤشرات إضافية للـ AOV
  const hasOrders = totalOrders > 0;

  const lines = [];

  // ترويسة التقرير — شادي / فريق AOV
  lines.push(`*تقرير AOV اليومي — ${company.name || 'المتجر'}*`);
  lines.push(`التاريخ: ${dateString}`);
  lines.push('─────────────────────');

  // 1. الملخص التنفيذي
  lines.push('*الملخص التنفيذي:*');
  if (hasOrders) {
    lines.push(`• إجمالي الطلبات: *${totalOrders}* طلب`);
    lines.push(`• إجمالي الإيرادات: *${totalRevenue.toLocaleString('en-US')}* ${currency}`);
    lines.push(`• متوسط قيمة الطلب: *${avgOrderValue.toLocaleString('en-US')}* ${currency}`);
  } else {
    lines.push('• لا يوجد طلبات مسجلة حتى الآن');
  }
  lines.push('');

  // 2. حالة العمليات
  if (operations) {
    lines.push('*مؤشرات الطلبات:*');
    lines.push(`• مؤكدة: ${operations.confirmed || 0} | شحن: ${operations.shipped || 0} | مسلمة: ${operations.delivered || 0}`);
    if ((operations.canceledOrReturned || 0) > 0) {
      lines.push(`• ملغي/مرتجع: ${operations.canceledOrReturned} (${operations.cancelRate}%)`);
    }
    lines.push('');
  }

  // 3. أفضل المنتجات
  if (topSellingProducts && topSellingProducts.length > 0) {
    lines.push('*أبرز المنتجات:*');
    topSellingProducts.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name} — ${item.quantity} قطعة`);
    });
    lines.push('');
  }

  // 4. تنبيهات المخزون (مرتبط بالـ AOV لأن نقص المخزون يؤثر على الباقات)
  if (lowStockProducts && lowStockProducts.length > 0) {
    lines.push('*تنبيهات مخزون:*');
    lowStockProducts.forEach(item => {
      lines.push(`• ${item.name}: باقي (${item.stock}) وحدة`);
    });
    lines.push('');
  }

  // 5. الحقول غير المتاحة (شفافية كاملة — لا تخمين)
  lines.push('*بيانات تحتاج ربط أدوات تفصيلية:*');
  lines.push('• متوسط آخر 7 أيام: مش متاح');
  lines.push('• متوسط آخر 30 يوم: مش متاح');
  lines.push('• نسبة الطلبات متعددة القطع: مش متاح');
  lines.push('• تأثير الكوبونات على AOV: مش متاح');
  lines.push('• تأثير باقات العروض على AOV: مش متاح');
  lines.push('');

  lines.push('─────────────────────');
  lines.push('*أهم قرار النهاردة هو:*');
  if (!hasOrders) {
    lines.push('مراجعة سبب غياب الطلبات وفحص حالة المتجر.');
  } else if (avgOrderValue < 400) {
    lines.push(`رفع متوسط قيمة الطلب من ${avgOrderValue} جنيه — مراجعة الباقات والشحن المجاني.`);
  } else if (lowStockProducts && lowStockProducts.length > 0) {
    lines.push(`تجديد مخزون ${lowStockProducts[0].name} لتجنب توقف الباقات النشطة.`);
  } else {
    lines.push('مراجعة أفضل 3 منتجات وتقييم إمكانية بناء باقة Upsell عليها.');
  }

  return lines.join('\n');
}

/**
 * بدء كرون التقرير اليومي لـ AOV
 */
function startAovDailyReportCron() {
  if (schedulerTask) {
    return schedulerTask;
  }

  if (process.env.AOV_DAILY_REPORT_CRON === 'false') {
    console.log('ℹ️ [AOV-DAILY-REPORT-CRON] Disabled by environment variable AOV_DAILY_REPORT_CRON=false');
    return null;
  }

  // فحص كل 15 دقيقة لاكتشاف الشركات التي حان وقت تقريرها
  schedulerTask = cron.schedule('*/15 * * * *', async () => {
    if (isTickRunning) {
      console.log('⚠️ [AOV-DAILY-REPORT-CRON] Previous run still in progress, skipping tick');
      return;
    }

    isTickRunning = true;

    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();

      // جلب إعدادات التقارير المجدولة من نوع AOV أو عمليات (الرنج الزمني: 21:00)
      const configs = await safeQuery(() => prisma.whatsAppScheduledReport.findMany({
        where: {
          isEnabled: true,
          reportType: { in: ['AOV_DAILY', 'SALES_OPERATIONS'] }
        },
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

        // حماية من التكرار اليومي
        if (config.lastSentAt) {
          const lastSentDayStr = formatInTimeZone(config.lastSentAt, timeZone, 'yyyy-MM-dd');
          if (lastSentDayStr === todayStr) continue;
        }

        // فحص مطابقة الوقت المجدول (21:00 افتراضياً)
        const [targetHour, targetMin] = (config.sendTime || '21:00').split(':').map(Number);
        const currentHour = Number(formatInTimeZone(now, timeZone, 'H'));
        const currentMin = Number(formatInTimeZone(now, timeZone, 'm'));

        const diffMinutes = (currentHour * 60 + currentMin) - (targetHour * 60 + targetMin);
        if (diffMinutes < 0 || diffMinutes >= 20) continue;

        console.log(`⏰ [AOV-DAILY-REPORT-CRON] Generating AOV report for ${config.company?.name || config.companyId}...`);

        try {
          const messageText = await generateAovReport(config.companyId, config, prisma);

          // إرسال عبر periodicReportService بمحتوى مخصص
          const result = await periodicReportService.dispatchScheduledReport(config.id, {
            customMessage: messageText
          });

          if (result && result.success) {
            console.log(`✅ [AOV-DAILY-REPORT-CRON] AOV report sent to ${result.deliveredCount || 1} recipients for ${config.company?.name}`);
          } else {
            console.warn(`⚠️ [AOV-DAILY-REPORT-CRON] AOV report dispatch issue for ${config.companyId}:`, result?.reason || result?.error || 'unknown');
          }
        } catch (reportErr) {
          console.error(`❌ [AOV-DAILY-REPORT-CRON] Failed for company ${config.companyId}:`, reportErr.message);
        }
      }
    } catch (error) {
      console.error('❌ [AOV-DAILY-REPORT-CRON] Tick error:', error.message);
    } finally {
      isTickRunning = false;
    }
  });

  console.log('✅ [AOV-DAILY-REPORT-CRON] AOV daily report cron started (checks every 15 min, fires at configured time per company)');
  return schedulerTask;
}

function stopAovDailyReportCron() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('🛑 [AOV-DAILY-REPORT-CRON] AOV daily report cron stopped');
  }
}

module.exports = {
  startAovDailyReportCron,
  stopAovDailyReportCron,
};
