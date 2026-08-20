/**
 * ╪Ñ╪╢╪º┘ü╪⌐ ╪Ñ╪╣╪»╪º╪» "╪▒╪│╪º┘ä╪⌐ ╪ú┘ê┘ä ╪╕┘ç┘ê╪▒ ┘ä┘ä╪ú┘ê╪▒╪»╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä" + ┘é┘è┘à enum ╪¼╪»┘è╪»╪⌐ ┘ä┘ä╪¡╪»╪½
 * INCOMPLETE_CART_FIRST_APPEARANCE ╪╣┘ä┘ë 3 ╪ú┘å┘ê╪º╪╣ enum ┘ü┘è Postgres.
 *
 * ╪ó┘à┘å (idempotent): ADD VALUE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 *
 * ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à: node scripts/add_incomplete_cart_immediate_message.js [--dry-run]
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
    console.log('Γä╣∩╕Å MySQL: enums ╪║┘è╪▒ ┘à╪»╪╣┘ê┘à╪⌐╪¢ ╪¬┘à ╪¬╪«╪╖┘è ALTER TYPE. ╪│┘è┘Å╪╢╪º┘ü ╪º┘ä╪╣┘à┘ê╪» ┘ü┘é╪╖.');
  }

  for (const typeName of ENUM_TYPES) {
    const sql = `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'INCOMPLETE_CART_FIRST_APPEARANCE'`;
    if (DRY_RUN) {
      console.log(`Γ£à (dry-run) ${sql}`);
      continue;
    }
    await prisma.$executeRawUnsafe(sql);
    console.log(`Γ£à Enum value added to ${typeName}`);
  }

  const columnSql = isMysql
    ? 'ALTER TABLE `whatsapp_notification_settings` ADD COLUMN IF NOT EXISTS `incompleteCartImmediateMessage` BOOLEAN NOT NULL DEFAULT false'
    : 'ALTER TABLE "whatsapp_notification_settings" ADD COLUMN IF NOT EXISTS "incompleteCartImmediateMessage" BOOLEAN NOT NULL DEFAULT false';

  if (DRY_RUN) {
    console.log(`Γ£à (dry-run) ${columnSql}`);
  } else {
    await prisma.$executeRawUnsafe(columnSql);
    console.log(`Γ£à Column added to whatsapp_notification_settings`);
  }

  await prisma.$disconnect();
  console.log('≡ƒÄë Migration complete.');
}

main().catch((e) => {
  console.error('Γ¥î Failed:', e.message);
  process.exit(1);
});
