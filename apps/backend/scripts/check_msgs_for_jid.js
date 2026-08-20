const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sessionId = 'cmp5bpemv126ujuxkvsowr7ol';
    const jid = '201119982260@s.whatsapp.net';
    const msgs = await prisma.whatsAppMessage.findMany({
        where: { sessionId, remoteJid: jid },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: { id: true, content: true, messageType: true, fromMe: true, timestamp: true }
    });
    console.log('Messages:', JSON.stringify(msgs, null, 2));
    console.log('Total:', msgs.length);
    await prisma.$disconnect();
}
main().catch(console.error);
