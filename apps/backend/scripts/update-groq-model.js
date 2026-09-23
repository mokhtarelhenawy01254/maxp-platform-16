const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateGroqModel() {
    try {
        console.log('🔄 Checking for Groq keys/models...');

        // Find all Groq keys including their models
        const keys = await prisma.aIKey.findMany({
            where: { provider: 'GROQ' },
            include: { models: true }
        });

        console.log(`Found ${keys.length} Groq keys.`);

        const SUPPORTED_MODELS = [
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'qwen/qwen3.8-27b'
        ];

        // Legacy models to remove (retired by Groq 2026-08-16 / 2026-09-14)
        const DEPRECATED_MODELS = ['llama3-8b-8192', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.6-27b'];

        for (const key of keys) {
            console.log(`\n🔑 Processing Key ID: ${key.id}`);

            const existingModels = key.models;

            // 1. Add all supported models
            for (const modelName of SUPPORTED_MODELS) {
                const exists = existingModels.find(m => m.modelName === modelName);

                if (exists) {
                    console.log(`- Model ${modelName} already exists.`);
                    if (!exists.isEnabled) {
                        console.log(`  -> Enabling...`);
                        await prisma.aIModelConfig.update({
                            where: { id: exists.id },
                            data: { isEnabled: true }
                        });
                    }
                } else {
                    console.log(`- Model ${modelName} NOT found. Creating...`);
                    await prisma.aIModelConfig.create({
                        data: {
                            keyId: key.id,
                            modelName: modelName,
                            isEnabled: true,
                            priority: 1
                        }
                    });
                }
            }

            // 2. Remove deprecated models
            for (const oldModel of DEPRECATED_MODELS) {
                const target = existingModels.find(m => m.modelName === oldModel);
                if (target) {
                    console.log(`- Found deprecated model ${oldModel}. Deleting...`);
                    await prisma.aIModelConfig.delete({
                        where: { id: target.id }
                    });
                }
            }
        }

        console.log('\n🎉 Done updating Groq models.');

    } catch (error) {
        console.error('❌ Error updating Groq model:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateGroqModel();
