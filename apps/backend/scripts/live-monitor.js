
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function monitor() {
    console.log('ðŸ‘€ Watching SentMessageStat table for 60 seconds...');
    const prisma = getSharedPrismaClient();
    let lastCount = await prisma.sentMessageStat.count();
    console.log(`Initial count: ${lastCount}`);

    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const currentCount = await prisma.sentMessageStat.count();
        if (currentCount !== lastCount) {
            console.log(`ðŸ”” Count changed: ${lastCount} -> ${currentCount} (+${currentCount - lastCount}) at ${new Date().toLocaleTimeString()}`);
            lastCount = currentCount;

            const latest = await prisma.sentMessageStat.findFirst({
                orderBy: { createdAt: 'desc' },
                select: {
                    recipientFacebookId: true,
                    messageId: true,
                    messageStatus: true,
                    sentAt: true
                }
            });
            console.log('Latest record:', JSON.stringify(latest, null, 2));
        }
    }
}

monitor().catch(console.error);

