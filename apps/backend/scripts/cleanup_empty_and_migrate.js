const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const c = await p.company.findUnique({ where: { slug: 'flora' } });
    if (!c) { console.log('Company not found'); return; }
    const ss = await p.whatsAppSession.findMany({ where: { companyId: c.id } });
    let totalDeleted = 0;
    for (const s of ss) {
        const d = await p.whatsAppContact.deleteMany({ where: { sessionId: s.id, totalMessages: 0 } });
        totalDeleted += d.count;
        console.log(s.name + ' deleted ' + d.count + ' empty contacts');
    }
    console.log('Total deleted: ' + totalDeleted);
    for (const s of ss) {
        const contacts = await p.whatsAppContact.findMany({
            where: { sessionId: s.id, lastMessagePreview: null },
            select: { id: true, jid: true }
        });
        console.log(s.name + ' needs migration: ' + contacts.length);
        for (const contact of contacts) {
            const lastMsg = await p.whatsAppMessage.findFirst({
                where: { sessionId: s.id, remoteJid: contact.jid },
                orderBy: { timestamp: 'desc' },
                select: { content: true, messageType: true }
            });
            if (lastMsg) {
                const preview = lastMsg.content || (lastMsg.messageType === 'AUDIO' ? '╪▒╪│╪º┘ä╪⌐ ╪╡┘ê╪¬┘è╪⌐' : lastMsg.messageType);
                await p.whatsAppContact.update({ where: { id: contact.id }, data: { lastMessagePreview: preview } });
            }
        }
        console.log(s.name + ' migrated');
    }
    await p.$disconnect();
}
main().catch(console.error);
