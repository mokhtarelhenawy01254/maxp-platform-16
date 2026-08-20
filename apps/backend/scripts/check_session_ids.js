const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const ss = await p.whatsAppSession.findMany({
        where: { company: { slug: 'flora' } },
        select: { id: true, name: true, phoneNumber: true, status: true }
    });
    console.log('Sessions:', JSON.stringify(ss, null, 2));
    for (const s of ss) {
        const cnt = await p.whatsAppContact.count({ where: { sessionId: s.id } });
        const msgs = await p.whatsAppMessage.count({ where: { sessionId: s.id } });
        console.log(s.name, '-> contacts:', cnt, 'messages:', msgs);
    }
    await p.$disconnect();
}
main().catch(console.error);
