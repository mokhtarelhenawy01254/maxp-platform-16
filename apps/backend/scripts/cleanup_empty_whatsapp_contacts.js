const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sessions = await prisma.whatsAppSession.findMany({
        where: { company: { slug: 'flora' } },
        select: { id: true, name: true, phoneNumber: true }
    });
    for (const s of sessions) {
        const contacts = await prisma.whatsAppContact.count({ where: { sessionId: s.id } });
        const messages = await prisma.whatsAppMessage.count({ where: { sessionId: s.id } });
        const sample = await prisma.whatsAppContact.findMany({
            where: { sessionId: s.id },
            select: { pushName: true, totalMessages: true, phoneNumber: true, isGroup: true },
            take: 5
        });
        console.log('Session:', s.name, '(' + s.phoneNumber + ') [' + s.id + ']');
        console.log('  Contacts:', contacts, '| Messages:', messages);
        console.log('  Sample:', JSON.stringify(sample, null, 2));
    }
    await prisma.$disconnect();
}
main().catch(console.error);
