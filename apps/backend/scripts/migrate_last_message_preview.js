const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const COMPANY_SLUG = 'flora';
    console.log('🔄 بدء تحديث lastMessagePreview للبيانات القديمة...\n');
    const company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } });
    if (!company) { console.error('❌ الشركة غير موجودة'); process.exit(1); }
    console.log('✅ الشركة:', company.name);
    const sessions = await prisma.whatsAppSession.findMany({
        where: { companyId: company.id },
        select: { id: true, name: true }
    });
    console.log('📱 الجلسات:', sessions.length);
    let updated = 0;
    for (const session of sessions) {
        const contacts = await prisma.whatsAppContact.findMany({
            where: { sessionId: session.id },
            select: { id: true, jid: true, pushName: true, lastMessagePreview: true }
        });
        console.log(`\n📋 جلسة ${session.name}: ${contacts.length} contact`);
        for (const contact of contacts) {
            const lastMsg = await prisma.whatsAppMessage.findFirst({
                where: { sessionId: session.id, remoteJid: contact.jid },
                orderBy: { timestamp: 'desc' },
                select: { content: true, messageType: true }
            });
            if (lastMsg) {
                const preview = lastMsg.content || (lastMsg.messageType === 'AUDIO' ? '🎵 رسالة صوتية' : lastMsg.messageType === 'IMAGE' ? '🖼️ صورة' : lastMsg.messageType === 'VIDEO' ? '🎬 فيديو' : lastMsg.messageType === 'DOCUMENT' ? '📄 مستند' : lastMsg.messageType);
                if (contact.lastMessagePreview !== preview) {
                    await prisma.whatsAppContact.update({
                        where: { id: contact.id },
                        data: { lastMessagePreview: preview }
                    });
                    updated++;
                }
            }
        }
    }
    console.log(`\n✅ تم تحديث ${updated} contact`);
    await prisma.$disconnect();
}
main().catch(console.error);
