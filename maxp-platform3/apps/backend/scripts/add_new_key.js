const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addKey() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const name = process.env.GOOGLE_AI_KEY_NAME || 'user-test-key';

    if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY is required.');
    }

    console.log(`Adding key: ${name}...`);

    try {
        // Check if exists
        const existing = await prisma.aIKey.findUnique({ where: { apiKey } });

        if (existing) {
            console.log('Key already exists. Updating status...');
            await prisma.aIKey.update({
                where: { id: existing.id },
                data: { isActive: true, priority: 20 }
            });
        } else {
            await prisma.aIKey.create({
                data: {
                    apiKey,
                    provider: 'GOOGLE',
                    keyType: 'CENTRAL',
                    name: name,
                    isActive: true,
                    priority: 20, // Higher priority than previous
                    usage: JSON.stringify({ used: 0, limit: 1000000 })
                }
            });
            console.log('Key created successfully.');
        }

        const activeKeys = await prisma.aIKey.findMany({ where: { isActive: true, provider: 'GOOGLE' } });
        console.log(`Active Google Keys: ${activeKeys.length}`);

    } catch (error) {
        console.error('Error adding key:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addKey();
