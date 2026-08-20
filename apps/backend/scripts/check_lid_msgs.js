const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const s = 'cms3gkw5f0066jukvd2jwkgyw';
    const contacts = await prisma.whatsAppContact.findMany({
        where: { sessionId: s, jid: { startsWith: 'lid:' } },
        select: { jid: true, totalMessages: true, pushName: true },
        take: 5
    });
    console.log('LID contacts remaining:', contacts.length);
    for (const c of contacts) {
        const msgs = await prisma.whatsAppMessage.count({ where: { sessionId: s, remoteJid: c.jid } });
        console.log(' ', c.jid, '| totalMessages:', c.totalMessages, '| msgs in DB:', msgs, '| name:', c.pushName);
    }
    
    const phoneContacts = await prisma.whatsAppContact.findMany({
        where: { sessionId: s, NOT: { jid: { startsWith: 'lid:' } } },
        select: { jid: true, totalMessages: true, pushName: true },
        take: 3
    });
    console.log('\nPhone contacts sample:');
    for (const c of phoneContacts) {
        const msgs = await prisma.whatsAppMessage.count({ where: { sessionId: s, remoteJid: { contains: c.jid.slice(-10) } } });
        console.log(' ', c.jid, '| totalMessages:', c.totalMessages, '| msgs in DB (partial):', msgs);
    }
    await prisma.$disconnect();
}
main().catch(console.error);
