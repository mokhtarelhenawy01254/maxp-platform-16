/**
 * Backfill `lastMessageIsFromMe` على جدول whatsapp_contacts من آخر رسالة فعلية.
 *
 * الحقل كان موجود في الـ schema لكن مش كان بيتحدّث في كل مسارات الإرسال، فالحالات القديمة
 * كلها false افتراضي. الفلتر "بانتظار الرد" (unreplied) بيعتمد عليه، فلازم نعمل backfill مرة
 * واحدة قبل ما الفلتر يبقى دقيق على البيانات القديمة.
 *
 * الاستخدام: node scripts/backfill_whatsapp_lastMessageIsFromMe.js [--dry-run] [--company=COMPANY_ID]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');
const companyArg = process.argv.find((a) => a.startsWith('--company='));
const companyId = companyArg ? companyArg.split('=')[1] : null;

async function main() {
  const prisma = getSharedPrismaClient();
  const isMysql = String(process.env.POSTGRES_URL || process.env.DATABASE_URL || '').toLowerCase().startsWith('mysql://');
  const q = (ident) => (isMysql ? `\`${ident}\`` : `"${ident}"`);

  const totalContacts = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM ${q('whatsapp_contacts')}
    WHERE ${q('totalMessages')} > 0
      ${companyId ? `AND ${q('sessionId')} IN (SELECT ${q('id')} FROM ${q('whatsapp_sessions')} WHERE ${q('companyId')} = '${companyId}')` : ''}
  `);
  const total = Number(totalContacts[0]?.cnt || 0);
  console.log(`📊 Contacts with messages: ${total}${companyId ? ` (company ${companyId})` : ''}`);

  const changed = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS cnt
    FROM ${q('whatsapp_contacts')} wc
    WHERE wc.${q('totalMessages')} > 0
      ${companyId ? `AND wc.${q('sessionId')} IN (SELECT ${q('id')} FROM ${q('whatsapp_sessions')} WHERE ${q('companyId')} = '${companyId}')` : ''}
      AND COALESCE((
        SELECT wm.${q('fromMe')} FROM ${q('whatsapp_messages')} wm
        WHERE wm.${q('sessionId')} = wc.${q('sessionId')} AND wm.${q('remoteJid')} = wc.${q('jid')}
        ORDER BY wm.${q('timestamp')} DESC, wm.${q('createdAt')} DESC
        LIMIT 1
      ), wc.${q('lastMessageIsFromMe')}) <> wc.${q('lastMessageIsFromMe')}
  `);
  console.log(`🔁 Contacts whose last-message-fromMe differs from stored value: ${Number(changed[0]?.cnt || 0)}`);

  if (DRY_RUN) {
    console.log('✅ Dry-run: nothing applied. Remove --dry-run to backfill.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$executeRawUnsafe(`
    UPDATE ${q('whatsapp_contacts')} wc
    SET wc.${q('lastMessageIsFromMe')} = COALESCE((
          SELECT wm.${q('fromMe')} FROM ${q('whatsapp_messages')} wm
          WHERE wm.${q('sessionId')} = wc.${q('sessionId')} AND wm.${q('remoteJid')} = wc.${q('jid')}
          ORDER BY wm.${q('timestamp')} DESC, wm.${q('createdAt')} DESC
          LIMIT 1
        ), wc.${q('lastMessageIsFromMe')})
    WHERE wc.${q('totalMessages')} > 0
      ${companyId ? `AND wc.${q('sessionId')} IN (SELECT ${q('id')} FROM ${q('whatsapp_sessions')} WHERE ${q('companyId')} = '${companyId}')` : ''}
  `);

  console.log(`✅ Backfilled ${result} contacts.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
