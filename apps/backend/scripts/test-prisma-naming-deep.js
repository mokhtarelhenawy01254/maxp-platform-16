require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testPrisma() {
    console.log('ðŸš€ Starting Deep Prisma Naming Verification...');
    try {
        const prisma = getSharedPrismaClient();
        console.log('âœ… Prisma Client object obtained.');

        // Attempt to access it directly
        const aiSetting = prisma.aiSetting;
        console.log('â“ Directly access prisma.aiSetting type:', typeof aiSetting);

        if (aiSetting) {
            console.log('âœ… prisma.aiSetting IS DEFINED.');
        } else {
            console.error('âŒ prisma.aiSetting is STILL UNDEFINED.');
        }

        // Check all enumerable keys
        console.log('ðŸ“Š Enumerable keys on Prisma object (first 20):', Object.keys(prisma).slice(0, 20));

        // Try finding it case-insensitively in keys
        const foundKey = Object.keys(prisma).find(k => k.toLowerCase() === 'aisetting');
        console.log('ðŸ” Found case-insensitive key for "aisetting":', foundKey);

    } catch (error) {
        console.error('âŒ Test failed:', error);
    } finally {
        process.exit();
    }
}

testPrisma();

