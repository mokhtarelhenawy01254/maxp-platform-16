const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sessionId = 'cmp5bpemv126ujuxkvsowr7ol';
    const contacts = await prisma.whatsAppContact.findMany({
        where: { sessionId, pushName: { not: null } },
        select: { jid: true, pushName: true, totalMessages: true },
        orderBy: { totalMessages: 'desc' },
        take: 10
    });
    console.log('Contacts with pushName from session flora:');
    for (const c of contacts) {
        const jidWithoutDomain = c.jid.replace('@s.whatsapp.net', '').replace('@lid', '');
        const msgsExact = await prisma.whatsAppMessage.count({ where: { sessionId, remoteJid: c.jid } });
        const msgsPartial = await prisma.whatsAppMessage.count({ where: { sessionId, remoteJid: { contains: jidWithoutDomain } } });
        console.log(`  ${c.pushName}: jid="${c.jid}" totalMessages=${c.totalMessages} msgsExact=${msgsExact} msgsPartial=${msgsPartial}`);
    }
    await prisma.$disconnect();
}
main().catch(console.error);
