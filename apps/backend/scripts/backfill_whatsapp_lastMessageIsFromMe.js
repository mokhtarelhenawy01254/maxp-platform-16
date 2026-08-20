/**
 * Backfill `lastMessageIsFromMe` ╪╣┘ä┘ë ╪¼╪»┘ê┘ä whatsapp_contacts ┘à┘å ╪ó╪«╪▒ ╪▒╪│╪º┘ä╪⌐ ┘ü╪╣┘ä┘è╪⌐.
 *
 * ╪º┘ä╪¡┘é┘ä ┘â╪º┘å ┘à┘ê╪¼┘ê╪» ┘ü┘è ╪º┘ä┘Ç schema ┘ä┘â┘å ┘à╪┤ ┘â╪º┘å ╪¿┘è╪¬╪¡╪»┘æ╪½ ┘ü┘è ┘â┘ä ┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪î ┘ü╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐
 * ┘â┘ä┘ç╪º false ╪º┘ü╪¬╪▒╪º╪╢┘è. ╪º┘ä┘ü┘ä╪¬╪▒ "╪¿╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪▒╪»" (unreplied) ╪¿┘è╪╣╪¬┘à╪» ╪╣┘ä┘è┘ç╪î ┘ü┘ä╪º╪▓┘à ┘å╪╣┘à┘ä backfill ┘à╪▒╪⌐
 * ┘ê╪º╪¡╪»╪⌐ ┘é╪¿┘ä ┘à╪º ╪º┘ä┘ü┘ä╪¬╪▒ ┘è╪¿┘é┘ë ╪»┘é┘è┘é ╪╣┘ä┘ë ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐.
 *
 * ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à: node scripts/backfill_whatsapp_lastMessageIsFromMe.js [--dry-run] [--company=COMPANY_ID]
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
  console.log(`≡ƒôè Contacts with messages: ${total}${companyId ? ` (company ${companyId})` : ''}`);

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
  console.log(`≡ƒöü Contacts whose last-message-fromMe differs from stored value: ${Number(changed[0]?.cnt || 0)}`);

  if (DRY_RUN) {
    console.log('Γ£à Dry-run: nothing applied. Remove --dry-run to backfill.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$executeRawUnsafe(`
    UPDATE ${q('whatsapp_contacts')} wc
    SET ${q('lastMessageIsFromMe')} = COALESCE((
          SELECT wm.${q('fromMe')} FROM ${q('whatsapp_messages')} wm
          WHERE wm.${q('sessionId')} = wc.${q('sessionId')} AND wm.${q('remoteJid')} = wc.${q('jid')}
          ORDER BY wm.${q('timestamp')} DESC, wm.${q('createdAt')} DESC
          LIMIT 1
        ), ${q('lastMessageIsFromMe')})
    WHERE wc.${q('totalMessages')} > 0
      ${companyId ? `AND wc.${q('sessionId')} IN (SELECT ${q('id')} FROM ${q('whatsapp_sessions')} WHERE ${q('companyId')} = '${companyId}')` : ''}
  `);

  console.log(`Γ£à Backfilled ${result} contacts.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Γ¥î Failed:', e.message);
  process.exit(1);
});
