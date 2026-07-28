const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const sid = 'cms3ycqtd005bjul9s2hbyvol';
    const lids = await p.whatsAppContact.findMany({
        where: { sessionId: sid, jid: { contains: '@lid' }, totalMessages: { gt: 0 } },
        select: { jid: true, totalMessages: true, lastMessagePreview: true },
        take: 5
    });
    console.log('LIDs with totalMessages>0:', lids.length, '(showing 5)');
    for (const x of lids) {
        const msgs = await p.whatsAppMessage.findMany({
            where: { sessionId: sid, remoteJid: x.jid },
            select: { content: true, messageType: true, fromMe: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 2
        });
        console.log(x.jid, 'tm:', x.totalMessages, 'prev:', x.lastMessagePreview);
        for (const m of msgs) {
            console.log('  msg:', m.messageType, m.content ? m.content.substring(0, 50) : '(null)', 'fromMe:', m.fromMe);
        }
    }
    await p.$disconnect();
}
main().catch(console.error);
