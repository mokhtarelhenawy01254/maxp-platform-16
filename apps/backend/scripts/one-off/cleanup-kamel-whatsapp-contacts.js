const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const company = await p.company.findFirst({
    where: { name: { contains: 'kamel', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true }
  });
  if (!company) { console.log('ERROR: Company not found'); process.exit(1); }
  console.log('Company:', company.name, '(' + company.id + ')');
  const sessions = await p.whatsAppSession.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true, phoneNumber: true }
  });
  if (sessions.length === 0) { console.log('No WhatsApp sessions'); await p.$disconnect(); return; }
  console.log('Sessions:', sessions.length);
  const sessionIds = sessions.map(s => s.id);
  for (const sId of sessionIds) {
    const s = sessions.find(x => x.id === sId);
    const c = await p.whatsAppContact.count({ where: { sessionId: sId } });
    const m = await p.whatsAppMessage.count({ where: { sessionId: sId } });
    console.log('  ' + (s ? s.name : sId) + ': ' + c + ' contacts, ' + m + ' messages');
  }
  console.log('\nDeleting messages...');
  for (const sId of sessionIds) {
    const r = await p.whatsAppMessage.deleteMany({ where: { sessionId: sId } });
    console.log('  Deleted ' + r.count + ' messages');
  }
  console.log('Deleting contacts...');
  for (const sId of sessionIds) {
    const r = await p.whatsAppContact.deleteMany({ where: { sessionId: sId } });
    console.log('  Deleted ' + r.count + ' contacts');
  }
  console.log('\nDONE: All WhatsApp conversations cleared for', company.name);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
