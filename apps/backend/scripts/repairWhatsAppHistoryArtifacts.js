const { getSharedPrismaClient } = require('../services/sharedDatabase');

const apply = process.argv.includes('--apply');

async function main() {
    const prisma = getSharedPrismaClient();
    const artifacts = await prisma.whatsAppMessage.findMany({
        where: {
            messageType: 'UNSUPPORTED',
            OR: [
                { metadata: { contains: '"protocolMessage"' } },
                { metadata: { contains: '"messageStubType"' } },
                { metadata: { contains: '"senderKeyDistributionMessage"' } }
            ]
        },
        select: { id: true, sessionId: true, remoteJid: true }
    });

    const unresolvedLids = await prisma.whatsAppContact.count({
        where: { jid: { contains: '@lid' }, totalMessages: { gt: 0 } }
    });

    console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        historyArtifactsToHide: artifacts.length,
        unresolvedLidConversations: unresolvedLids
    }));

    if (!apply || artifacts.length === 0) return;

    await prisma.whatsAppMessage.updateMany({
        where: { id: { in: artifacts.map((message) => message.id) } },
        data: { isHidden: true, messageType: 'HISTORY_SYSTEM', content: null, updatedAt: new Date() }
    });

    const conversations = new Map();
    for (const artifact of artifacts) {
        conversations.set(`${artifact.sessionId}:${artifact.remoteJid}`, artifact);
    }

    for (const { sessionId, remoteJid } of conversations.values()) {
        const [totalMessages, latestMessage] = await Promise.all([
            prisma.whatsAppMessage.count({ where: { sessionId, remoteJid, isHidden: false } }),
            prisma.whatsAppMessage.findFirst({
                where: { sessionId, remoteJid, isHidden: false },
                select: { timestamp: true, content: true, messageType: true },
                orderBy: { timestamp: 'desc' }
            })
        ]);

        await prisma.whatsAppContact.updateMany({
            where: { sessionId, jid: remoteJid },
            data: {
                totalMessages,
                lastMessageAt: latestMessage?.timestamp || null,
                lastMessagePreview: latestMessage?.content || (latestMessage ? latestMessage.messageType : null),
                updatedAt: new Date()
            }
        });
    }
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
