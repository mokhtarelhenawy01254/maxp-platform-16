require('dotenv').config();
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const { runAggregation } = require('./aggregateStats');
const { subDays } = require('date-fns');

async function cleanupOldStats(retentionDays = 2) {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        // 1. Run aggregation for yesterday and today-so-far (to ensure we have summaries)
        console.log('🔄 Running daily aggregation before cleanup...');
        await runAggregation(2); // Aggregate last 2 days

        // 2. Delete raw stats older than retentionDays
        const cutoffDate = subDays(new Date(), retentionDays);
        console.log(`🧹 Cleaning up raw stats older than ${retentionDays} days (before ${cutoffDate.toISOString()})...`);

        const deleteResult = await prisma.sentMessageStat.deleteMany({
            where: {
                sentAt: { lt: cutoffDate }
            }
        });

        console.log(`✅ Cleanup complete. Deleted ${deleteResult.count} raw records.`);

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error; // Re-throw so the caller can catch it
    }
}

if (require.main === module) {
    const days = process.argv[2] ? parseInt(process.argv[2]) : 2;
    cleanupOldStats(days)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = {
    cleanupOldStats
};
