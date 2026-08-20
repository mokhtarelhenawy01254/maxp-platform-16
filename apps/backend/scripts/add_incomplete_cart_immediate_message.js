/**
 * إضافة إعداد "رسالة أول ظهور للأوردر غير المكتمل" + قيم enum جديدة للحدث
 * INCOMPLETE_CART_FIRST_APPEARANCE على 3 أنواع enum في Postgres.
 *
 * آمن (idempotent): ADD VALUE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 *
 * الاستخدام: node scripts/add_incomplete_cart_immediate_message.js [--dry-run]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

const ENUM_TYPES = [
  'whatsapp_notification_templates_eventType',
  'whatsapp_notification_logs_eventType',
  'whatsapp_notification_queue_eventType',
];

async function main() {
  const prisma = getSharedPrismaClient();
  const url = String(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
  const isMysql = url.toLowerCase().startsWith('mysql://');

  if (isMysql) {
    console.log('ℹ️ MySQL: enums غير مدعومة؛ تم تخطي ALTER TYPE. سيُضاف العمود فقط.');
  }

  for (const typeName of ENUM_TYPES) {
    const sql = `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'INCOMPLETE_CART_FIRST_APPEARANCE'`;
    if (DRY_RUN) {
      console.log(`✅ (dry-run) ${sql}`);
      continue;
    }
    await prisma.$executeRawUnsafe(sql);
    console.log(`✅ Enum value added to ${typeName}`);
  }

  const columnSql = isMysql
    ? 'ALTER TABLE `whatsapp_notification_settings` ADD COLUMN IF NOT EXISTS `incompleteCartImmediateMessage` BOOLEAN NOT NULL DEFAULT false'
    : 'ALTER TABLE "whatsapp_notification_settings" ADD COLUMN IF NOT EXISTS "incompleteCartImmediateMessage" BOOLEAN NOT NULL DEFAULT false';

  if (DRY_RUN) {
    console.log(`✅ (dry-run) ${columnSql}`);
  } else {
    await prisma.$executeRawUnsafe(columnSql);
    console.log(`✅ Column added to whatsapp_notification_settings`);
  }

  await prisma.$disconnect();
  console.log('🎉 Migration complete.');
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
