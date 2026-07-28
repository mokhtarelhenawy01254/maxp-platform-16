const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const companies = await p.company.findMany({
    where: { name: { contains: 'kamel', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true }
  });
  if (companies.length === 0) {
    console.log('No company found with name containing "kamel".');
    const recent = await p.company.findMany({ select: { id: true, name: true, slug: true }, orderBy: { createdAt: 'desc' }, take: 30 });
    console.log('Recent companies:', JSON.stringify(recent, null, 2));
    await p.$disconnect();
    return;
  }
  for (const c of companies) {
    console.log('Company:', JSON.stringify(c));
    const sessions = await p.whatsAppSession.findMany({
      where: { companyId: c.id },
      select: { id: true, name: true, phoneNumber: true }
    });
    console.log('WhatsApp sessions:', sessions.length);
    if (sessions.length === 0) {
      console.log('  No WhatsApp sessions');
      continue;
    }
    for (const s of sessions) {
      const contacts = await p.whatsAppContact.count({ where: { sessionId: s.id } });
      const msgs = await p.whatsAppMessage.count({ where: { sessionId: s.id } });
      console.log('  [' + s.id + '] ' + s.name + ' (' + s.phoneNumber + '): ' + contacts + ' contacts, ' + msgs + ' messages');
    }
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
