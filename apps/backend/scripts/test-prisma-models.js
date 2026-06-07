require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testPrisma() {
    console.log('ðŸš€ Starting Model Verification on Extended Client...');
    try {
        const prisma = getSharedPrismaClient();
        console.log('âœ… Prisma Client object obtained.');

        // Check standard models
        console.log('â“ prisma.user type:', typeof prisma.user);
        console.log('â“ prisma.company type:', typeof prisma.company);
        console.log('â“ prisma.aiSetting type:', typeof prisma.aiSetting);

        // Check if aiSettings (plural) still exists
        console.log('â“ prisma.aiSettings type:', typeof prisma.aiSettings);

        // If those are undefined, let's explore the object more
        if (typeof prisma.user === 'undefined') {
            console.warn('âš ï¸ Standard models are UNDEFINED on the returned object.');
            // Maybe it's nested?
        }

    } catch (error) {
        console.error('âŒ Test failed:', error);
    } finally {
        process.exit();
    }
}

testPrisma();

