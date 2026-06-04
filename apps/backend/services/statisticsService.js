/**
 * 📊 Statistics Service
 * 
 * Handles aggregation of daily message counts/conversions and data cleanup.
 * Replaces standalone scripts for better reliability and integration.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Runs aggregation for a specific day
 * @param {number} daysOffset - Offset from today (e.g., 1 for yesterday)
 */
async function runAggregation(daysToAggregate = 1) {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('❌ [AGGREGATE] Prisma client not ready');
        return;
    }

    console.log(`📈 [AGGREGATE] Starting aggregation for the last ${daysToAggregate} day(s)...`);

    try {
        // Get all active companies
        const companies = await prisma.company.findMany({
            select: { id: true }
        });

        for (let dayOffset = 1; dayOffset <= daysToAggregate; dayOffset++) {
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);
            date.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const dateLabel = date.toISOString().split('T')[0];
            console.log(`📊 [AGGREGATE] Processing day: ${dateLabel} (offset: -${dayOffset})`);

            for (const company of companies) {
                try {
                    const dayFilter = {
                        companyId: company.id,
                        sentAt: { gte: date, lte: endOfDay }
                    };

                    const [totalSent, totalSaved, totalIgnored, uniqueReach, savedReach, ignoredReach, orderCount, totalRevenue, convCreated, convExisted] = await Promise.all([
                        // Total messages sent
                        prisma.sentMessageStat.count({ where: dayFilter }),
                        // Saved messages
                        prisma.sentMessageStat.count({ where: { ...dayFilter, messageStatus: 'saved' } }),
                        // Ignored messages
                        prisma.sentMessageStat.count({ where: { ...dayFilter, messageStatus: 'ignored' } }),
                        // Unique recipients (Total)
                        prisma.sentMessageStat.groupBy({
                            by: ['recipientFacebookId'],
                            where: dayFilter
                        }).then(groups => groups.length),
                        // Saved Reach (Unique recipients of successful messages)
                        prisma.sentMessageStat.groupBy({
                            by: ['recipientFacebookId'],
                            where: { ...dayFilter, messageStatus: 'saved' }
                        }).then(groups => groups.length),
                        // Ignored Reach (Unique recipients of failed messages)
                        prisma.sentMessageStat.groupBy({
                            by: ['recipientFacebookId'],
                            where: { ...dayFilter, messageStatus: 'ignored' }
                        }).then(groups => groups.length),
                        // Orders
                        prisma.order?.count({
                            where: { companyId: company.id, createdAt: { gte: date, lte: endOfDay } }
                        }) || 0,
                        // Revenue
                        prisma.order?.aggregate({
                            where: { companyId: company.id, createdAt: { gte: date, lte: endOfDay } },
                            _sum: { total: true }
                        }) || { _sum: { total: 0 } },
                        // Conversations created
                        prisma.sentMessageStat.count({ where: { ...dayFilter, conversationStatus: 'created' } }),
                        // Conversations existed
                        prisma.sentMessageStat.count({ where: { ...dayFilter, conversationStatus: 'existed' } }),
                    ]);

                    // Skip if no data for this company on this day
                    if (totalSent === 0) continue;

                    // Upsert daily summary
                    await prisma.sentMessageDailySummary.upsert({
                        where: {
                            companyId_facebookPageId_date: {
                                companyId: company.id,
                                facebookPageId: 'TOTAL',
                                date: date
                            }
                        },
                        update: {
                            totalSent,
                            totalSaved,
                            totalIgnored,
                            uniqueReach,
                            savedReach,
                            ignoredReach,
                            orderCount,
                            totalRevenue: totalRevenue._sum?.total || 0,
                            conversationsCreated: convCreated,
                            conversationsExisted: convExisted,
                        },
                        create: {
                            companyId: company.id,
                            facebookPageId: 'TOTAL',
                            date: date,
                            totalSent,
                            totalSaved,
                            totalIgnored,
                            uniqueReach,
                            savedReach,
                            ignoredReach,
                            orderCount,
                            totalRevenue: totalRevenue._sum?.total || 0,
                            conversationsCreated: convCreated,
                            conversationsExisted: convExisted,
                        }
                    });
                } catch (companyError) {
                    console.error(`⚠️ [AGGREGATE] Failed for company ${company.id} on ${dateLabel}:`, companyError.message);
                }
            }
        }

        console.log(`✅ [AGGREGATE] Completed aggregation for the last ${daysToAggregate} day(s).`);
    } catch (error) {
        console.error('❌ [AGGREGATE] Fatal error:', error.message);
    }
}

/**
 * Cleanup records older than X days
 * @param {number} daysToKeep - Number of days to retain data
 */
async function cleanupOldStats(daysToKeep = 30) {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('❌ [CLEANUP] Prisma client not ready');
        return;
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysToKeep);

    console.log(`🧹 [CLEANUP] Removing data older than: ${threshold.toISOString().split('T')[0]}`);

    try {
        // Cleanup Queue Metrics
        const deletedMetrics = await prisma.queueMetric.deleteMany({
            where: { timestamp: { lt: threshold } }
        });
        console.log(`✅ [CLEANUP] Deleted ${deletedMetrics.count} old queue metrics`);

        // Cleanup Store Visits
        const deletedVisits = await prisma.storeVisit?.deleteMany({
            where: { visitedAt: { lt: threshold } }
        });
        if (deletedVisits) console.log(`✅ [CLEANUP] Deleted ${deletedVisits.count} old store visits`);

        // Cleanup Product Visits
        const deletedProductVisits = await prisma.productVisit?.deleteMany({
            where: { visitedAt: { lt: threshold } }
        });
        if (deletedProductVisits) console.log(`✅ [CLEANUP] Deleted ${deletedProductVisits.count} old product visits`);

        // Cleanup Raw Sent Message Stats
        const deletedStats = await prisma.sentMessageStat.deleteMany({
            where: { sentAt: { lt: threshold } }
        });
        console.log(`✅ [CLEANUP] Deleted ${deletedStats.count} old raw sent message stats`);

    } catch (error) {
        console.error('❌ [CLEANUP] Fatal error:', error.message);
    }
}

module.exports = {
    runAggregation,
    cleanupOldStats
};
