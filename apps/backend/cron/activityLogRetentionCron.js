/**
 * 🧹 Activity Log Retention — تقليم سجل النشاط
 * ------------------------------------------------------------------
 * جدول activity_logs يستقبل الآن نوعين من الصفوف:
 *  - AUTH/LOGIN_SUCCESS : سجل دخول دائم (مطلوب للتدقيق) — يُحفظ طويلًا.
 *  - PULSE/TENANT_ACTIVITY : نبض نشاط دوري (نبضة/ساعة لكل شركة) — بيانات تشغيلية
 *    قيمتها تتركز في آخر أسابيع؛ تسريحها يمنع تضخم الجدول وبطء الـ VACUUM.
 *
 * السياسة:
 *  - PULSE أقدم من 45 يومًا → حذف.
 *  - بقية السجلات أقدم من 365 يومًا (ما عدا severity='CRITICAL') → حذف.
 * الحذف على دفعات (LIMIT) لتجنّب قفل طويل أو WAL ضخم.
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const PULSE_RETENTION_DAYS = 45;
const GENERAL_RETENTION_DAYS = 365;
const BATCH_LIMIT = 50000;

async function pruneActivityLogs() {
  const prisma = getSharedPrismaClient();

  const pulseDeleted = await prisma.$executeRawUnsafe(
    `DELETE FROM activity_logs
      WHERE id IN (
        SELECT id FROM activity_logs
         WHERE category = 'PULSE'
           AND "createdAt" < NOW() - ($1 || ' days')::interval
         LIMIT ${BATCH_LIMIT}
      )`,
    String(PULSE_RETENTION_DAYS),
  );

  const generalDeleted = await prisma.$executeRawUnsafe(
    `DELETE FROM activity_logs
      WHERE id IN (
        SELECT id FROM activity_logs
         WHERE category <> 'PULSE'
           AND severity <> 'CRITICAL'
           AND "createdAt" < NOW() - ($1 || ' days')::interval
         LIMIT ${BATCH_LIMIT}
      )`,
    String(GENERAL_RETENTION_DAYS),
  );

  if (pulseDeleted || generalDeleted) {
    console.log(`🧹 [ACTIVITY-RETENTION] Deleted pulse=${pulseDeleted} general=${generalDeleted}`);
  }
}

function startActivityLogRetentionCron() {
  // كل يوم 04:20 صباحًا (توقيت السيرفر: Africa/Cairo)
  cron.schedule('20 4 * * *', async () => {
    try {
      await pruneActivityLogs();
    } catch (error) {
      console.error('❌ [ACTIVITY-RETENTION] Failed:', error.message);
    }
  });
  console.log('✅ [ACTIVITY-RETENTION] Activity log retention cron started');
}

module.exports = { startActivityLogRetentionCron, pruneActivityLogs };
