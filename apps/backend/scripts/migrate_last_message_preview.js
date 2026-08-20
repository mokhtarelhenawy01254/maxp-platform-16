const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const COMPANY_SLUG = 'flora';
    console.log('≡ƒöä ╪¿╪»╪í ╪¬╪¡╪»┘è╪½ lastMessagePreview ┘ä┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘é╪»┘è┘à╪⌐...\n');
    const company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } });
    if (!company) { console.error('Γ¥î ╪º┘ä╪┤╪▒┘â╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐'); process.exit(1); }
    console.log('Γ£à ╪º┘ä╪┤╪▒┘â╪⌐:', company.name);
    const sessions = await prisma.whatsAppSession.findMany({
        where: { companyId: company.id },
        select: { id: true, name: true }
    });
    console.log('≡ƒô▒ ╪º┘ä╪¼┘ä╪│╪º╪¬:', sessions.length);
    let updated = 0;
    for (const session of sessions) {
        const contacts = await prisma.whatsAppContact.findMany({
            where: { sessionId: session.id },
            select: { id: true, jid: true, pushName: true, lastMessagePreview: true }
        });
        console.log(`\n≡ƒôï ╪¼┘ä╪│╪⌐ ${session.name}: ${contacts.length} contact`);
        for (const contact of contacts) {
            const lastMsg = await prisma.whatsAppMessage.findFirst({
                where: { sessionId: session.id, remoteJid: contact.jid },
                orderBy: { timestamp: 'desc' },
                select: { content: true, messageType: true }
            });
            if (lastMsg) {
                const preview = lastMsg.content || (lastMsg.messageType === 'AUDIO' ? '≡ƒÄ╡ ╪▒╪│╪º┘ä╪⌐ ╪╡┘ê╪¬┘è╪⌐' : lastMsg.messageType === 'IMAGE' ? '≡ƒû╝∩╕Å ╪╡┘ê╪▒╪⌐' : lastMsg.messageType === 'VIDEO' ? '≡ƒÄ¼ ┘ü┘è╪»┘è┘ê' : lastMsg.messageType === 'DOCUMENT' ? '≡ƒôä ┘à╪│╪¬┘å╪»' : lastMsg.messageType);
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
    console.log(`\nΓ£à ╪¬┘à ╪¬╪¡╪»┘è╪½ ${updated} contact`);
    await prisma.$disconnect();
}
main().catch(console.error);
