
const systemManager = require('../services/systemManager');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function runDebug() {
    console.log('ðŸš€ Starting Debug Script for System Initialization...');
    try {
        // Ensure DB connection
        const prisma = getSharedPrismaClient();

        console.log('ðŸ“‹ Current Systems in DB (Before):');
        const systemsBefore = await prisma.systemSettings.findMany({ select: { systemName: true } });
        console.log(systemsBefore.map(s => s.systemName));

        console.log('\nâš™ï¸ Running initializeSystemSettings()...');
        await systemManager.initializeSystemSettings();

        console.log('\nðŸ“‹ Current Systems in DB (After):');
        const systemsAfter = await prisma.systemSettings.findMany({ select: { systemName: true } });
        console.log(systemsAfter.map(s => s.systemName));

        console.log('\nâœ… Debug check complete.');
    } catch (error) {
        console.error('âŒ Error during debug:', error);
    } finally {
        process.exit();
    }
}

runDebug();

