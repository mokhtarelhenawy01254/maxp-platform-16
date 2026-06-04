const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    try {
        const prisma = getSharedPrismaClient();
        console.log('--- Initializing Prisma Check ---');

        // List all available models to see their names
        const models = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
        console.log('Available models:', models.sort().join(', '));

        // Try to find the message model (case insensitive check)
        const messageModelKey = models.find(m => m.toLowerCase() === 'message');

        if (!messageModelKey) {
            console.error('CRITICAL: Message model not found on Prisma instance!');
            return;
        }

        console.log(`Using model: ${messageModelKey}`);
        const messages = await prisma[messageModelKey].findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                text: true,
                createdAt: true,
                conversation: {
                    select: { channel: true, channelPageId: true }
                }
            }
        });

        if (messages.length === 0) {
            console.log('No messages found in database.');
        } else {
            messages.forEach(m => {
                console.log(`[${m.createdAt.toISOString()}] [${m.conversation.channel}] [Page: ${m.conversation.channelPageId}] ${m.text ? m.text.substring(0, 30) : '[No Text]'}`);
            });
        }

    } catch (error) {
        console.error('Error during check:', error);
    } finally {
        process.exit(0);
    }
}

check();

