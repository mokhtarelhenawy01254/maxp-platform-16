const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const ss = await p.whatsAppSession.findMany({
        where: { company: { slug: 'flora' } },
        select: { id: true, name: true }
    });
    for (const s of ss) {
        const tm0 = await p.whatsAppContact.count({ where: { sessionId: s.id, totalMessages: 0 } });
        const tmGt0 = await p.whatsAppContact.count({ where: { sessionId: s.id, totalMessages: { gt: 0 } } });
        const lids = await p.whatsAppContact.count({ where: { sessionId: s.id, jid: { contains: '@lid' } } });
        const nonLids = await p.whatsAppContact.count({ where: { sessionId: s.id, NOT: { jid: { contains: '@lid' } } } });
        console.log(s.name, '| total:', (tm0+tmGt0), '| tm=0:', tm0, '| tm>0:', tmGt0, '| LIDs:', lids, '| nonLID:', nonLids);
    }
    await p.$disconnect();
}
main().catch(console.error);
