/**
 * ⏰ Wholesale Due Reminder Cron Job
 * كرون يومي لتذكير موزعي وتجار الجملة بالمستحقات المالية
 *
 * القواعد:
 * - يعمل يومياً في الساعة 10:00 صباحاً (ضمن ساعات العمل والنافذة المناسبة)
 * - Cooldown إلزامي: 3 أيام لكل موزع (أقصى حد للتذكيرات ≤ 3 في الأسبوع الواحد لمنع الإزعاج)
 * - التحقق من إعدادات الشركة وقفل الإشعارات (wholesaleNotificationsEnabled / wholesaleDueReminderEnabled)
 * - الالتزام بقوالب Meta المعتمدة أو نص Baileys
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

let isRunning = false;
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 أيام

async function runWholesaleDueReminders() {
  if (isRunning) {
    console.log('⏰ [WHOLESALE-CRON] Previous due reminder run is still active, skipping.');
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const prisma = getSharedPrismaClient();

  const stats = {
    scanned: 0,
    sent: 0,
    skippedCooldown: 0,
    skippedDisabled: 0,
    skippedNoPhone: 0,
    failed: 0
  };

  try {
    console.log('⏰ [WHOLESALE-CRON] Starting daily wholesale due reminder job...');

    // 1. استخراج تجار الجملة النشطين أصحاب الأرصدة المستحقة الموجبة
    const debtors = await prisma.wholesaleCustomer.findMany({
      where: {
        isActive: true,
        currentBalance: { gt: 0 }
      },
      include: {
        customer: true,
        company: {
          select: {
            id: true,
            name: true,
            whatsAppNotificationSettings: true
          }
        }
      }
    });

    stats.scanned = debtors.length;
    console.log(`⏰ [WHOLESALE-CRON] Found ${debtors.length} active wholesale debtors.`);

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);

    for (const wc of debtors) {
      try {
        const phone = wc.customer?.phone;
        if (!phone) {
          stats.skippedNoPhone++;
          continue;
        }

        // 2. التحقق من إعدادات الشركة للإشعارات
        const settings = wc.company?.whatsAppNotificationSettings;
        if (settings) {
          if (!settings.isEnabled || settings.wholesaleNotificationsEnabled === false || settings.wholesaleDueReminderEnabled === false) {
            stats.skippedDisabled++;
            continue;
          }
        }

        // 3. التحقق من الـ Cooldown (3 أيام لكل موزع)
        const recentReminder = await prisma.whatsAppNotificationLog.findFirst({
          where: {
            companyId: wc.companyId,
            recipientPhone: phone,
            status: { not: 'FAILED' },
            createdAt: { gte: cooldownThreshold },
            OR: [
              { rawEventType: 'WHOLESALE_DUE_REMINDER' },
              { eventType: 'PAYMENT_REMINDER' }
            ]
          },
          select: { id: true, createdAt: true }
        });

        if (recentReminder) {
          stats.skippedCooldown++;
          continue;
        }

        // 4. إرسال الإشعار عبر خدمة الواتساب المعتمدة
        const result = await WhatsAppNotificationService.sendWholesaleDueReminderNotification({
          companyId: wc.companyId,
          wholesaleCustomer: wc,
          dueDate: null
        });

        if (result && result.success) {
          stats.sent++;
        } else {
          stats.failed++;
          console.warn(`⚠️ [WHOLESALE-CRON] Reminder send not completed for distributor ${wc.id}: ${result?.reason || 'unknown'}`);
        }
      } catch (distributorErr) {
        stats.failed++;
        console.error(`❌ [WHOLESALE-CRON] Error processing distributor ${wc.id}:`, distributorErr.message);
      }
    }

    console.log(`✅ [WHOLESALE-CRON] Completed: scanned=${stats.scanned}, sent=${stats.sent}, cooldown=${stats.skippedCooldown}, disabled=${stats.skippedDisabled}, no_phone=${stats.skippedNoPhone}, failed=${stats.failed}`);
    return stats;
  } catch (error) {
    console.error('❌ [WHOLESALE-CRON] Fatal error in wholesale due reminders job:', error.message);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * بدء تشغيل المجدول اليومي (10:00 صباحاً يومياً)
 */
function startWholesaleDueReminderCron() {
  console.log('⏰ [WHOLESALE-CRON] Registering daily wholesale due reminder cron (10:00 AM)...');
  // Runs at 10:00 AM every day: 0 10 * * *
  const job = cron.schedule('0 10 * * *', runWholesaleDueReminders);
  console.log('✅ [WHOLESALE-CRON] Daily wholesale due reminder cron registered.');
  return job;
}

module.exports = {
  startWholesaleDueReminderCron,
  runWholesaleDueReminders,
  COOLDOWN_MS
};
