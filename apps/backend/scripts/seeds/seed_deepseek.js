const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDeepSeek() {
    console.log('ðŸš€ Seeding DeepSeek API Key...');

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is required to seed DeepSeek credentials.');
    }

    try {
        // 1. Create or Update DeepSeek Key
        const deepseekKey = await prisma.aIKey.upsert({
            where: { apiKey: apiKey },
            update: {
                name: 'DeepSeek V3 (Custom)',
                provider: 'DEEPSEEK',
                isActive: true,
                keyType: 'CENTRAL'
            },
            create: {
                name: 'DeepSeek V3 (Custom)',
                apiKey: apiKey,
                provider: 'DEEPSEEK',
                isActive: true,
                keyType: 'CENTRAL'
            }
        });

        console.log(`âœ… Key created/updated: ${deepseekKey.id}`);

        // 2. Add DeepSeek Models
        const models = [
            { name: 'deepseek-flash', priority: 1 },
            { name: 'deepseek-v4-flash', priority: 2 }
        ];

        for (const m of models) {
            await prisma.aIModelConfig.upsert({
                where: {
                    keyId_modelName: {
                        keyId: deepseekKey.id,
                        modelName: m.name
                    }
                },
                update: {
                    isEnabled: true,
                    priority: m.priority
                },
                create: {
                    keyId: deepseekKey.id,
                    modelName: m.name,
                    isEnabled: true,
                    priority: m.priority
                }
            });
            console.log(`âœ… Model added: ${m.name}`);
        }

        // 3. Switch Global Default to DEEPSEEK (optional for testing)
        // await prisma.globalAIConfig.updateMany({
        //   data: { defaultProvider: 'DEEPSEEK' }
        // });
        // console.log('ðŸ”„ Switched default provider to DEEPSEEK');

        console.log('\nâœ¨ DeepSeek seeding finished.');
    } catch (error) {
        console.error('âŒ Seeding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedDeepSeek();

