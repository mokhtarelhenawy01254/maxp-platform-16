require('dotenv').config();
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');

/**
 * Optimized aggregation for a single company
 */
async function aggregateCompanyStats(companyId, targetDate) {
    const prisma = getSharedPrismaClient();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    console.log(`📊 [OPTIMIZED] Aggregating stats for company ${companyId} on ${format(targetDate, 'yyyy-MM-dd')}...`);

    // 1. Get Message Stats (Sent, Saved, Ignored, Created, Existed) in ONE query
    const messageStats = await prisma.$queryRaw`
        SELECT 
            COALESCE("facebookPageId", '') as "pageId",
            COUNT(*)::int as "totalSent",
            COUNT(*) FILTER (WHERE "messageStatus" = 'saved')::int as "totalSaved",
            COUNT(*) FILTER (WHERE "messageStatus" = 'ignored')::int as "totalIgnored",
            COUNT(DISTINCT "conversationId") FILTER (WHERE "conversationStatus" = 'created')::int as "conversationsCreated",
            COUNT(DISTINCT "conversationId") FILTER (WHERE "conversationStatus" = 'existed')::int as "conversationsExisted",
            COUNT(DISTINCT "recipientFacebookId")::int as "uniqueReach"
        FROM sent_message_stats
        WHERE "companyId" = ${companyId} 
          AND "sentAt" >= ${start} 
          AND "sentAt" <= ${end}
        GROUP BY COALESCE("facebookPageId", '')
    `;

    if (!messageStats || messageStats.length === 0) {
        console.log(`ℹ️ No stats found for company ${companyId} on this date.`);
        return;
    }

    // 2. Get Revenue Stats (Total Revenue, Order Count) in ONE query
    const revenueStats = await prisma.$queryRaw`
        SELECT 
            COALESCE(sms."facebookPageId", '') as "pageId",
            SUM(o.total)::float as "totalRevenue",
            COUNT(DISTINCT o.id)::int as "orderCount"
        FROM sent_message_stats sms
        INNER JOIN orders o ON o."conversationId" = sms."conversationId"
        WHERE sms."companyId" = ${companyId}
          AND sms."sentAt" >= ${start}
          AND sms."sentAt" <= ${end}
          AND o."companyId" = ${companyId}
          AND o."createdAt" >= ${start}
          AND o."createdAt" <= ${end}
        GROUP BY COALESCE(sms."facebookPageId", '')
    `;

    // Create a map for quick revenue lookup
    const revenueMap = new Map();
    revenueStats.forEach(rs => {
        revenueMap.set(rs.pageId, {
            totalRevenue: rs.totalRevenue || 0,
            orderCount: rs.orderCount || 0
        });
    });

    // 3. Upsert results into summary table
    for (const stat of messageStats) {
        const rev = revenueMap.get(stat.pageId) || { totalRevenue: 0, orderCount: 0 };

        await prisma.sentMessageDailySummary.upsert({
            where: {
                companyId_facebookPageId_date: {
                    companyId,
                    facebookPageId: stat.pageId,
                    date: start
                }
            },
            update: {
                totalSent: stat.totalSent,
                totalSaved: stat.totalSaved,
                totalIgnored: stat.totalIgnored,
                totalRevenue: rev.totalRevenue,
                orderCount: rev.orderCount,
                uniqueReach: stat.uniqueReach,
                conversationsCreated: stat.conversationsCreated,
                conversationsExisted: stat.conversationsExisted
            },
            create: {
                companyId,
                facebookPageId: stat.pageId,
                date: start,
                totalSent: stat.totalSent,
                uniqueReach: stat.uniqueReach,
                totalSaved: stat.totalSaved,
                totalIgnored: stat.totalIgnored,
                totalRevenue: rev.totalRevenue,
                orderCount: rev.orderCount,
                conversationsCreated: stat.conversationsCreated,
                conversationsExisted: stat.conversationsExisted
            }
        });
    }
}

/**
 * Discover and fix gaps in the summary table for the last N days
 */
async function discoverAndFixGaps(daysToCheck = 30) {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({ select: { id: true, name: true } });

    console.log(`🔍 [GAP-CHECK] Checking last ${daysToCheck} days for missing summaries across ${companies.length} companies...`);

    for (let i = 1; i <= daysToCheck; i++) {
        const targetDate = startOfDay(subDays(new Date(), i));

        // Find companies that have entries in raw stats but NOT in summary for this date
        // This is a bit complex in Prisma, so we'll do it per company for simplicity since it's optimized now
        for (const company of companies) {
            const summaryExists = await prisma.sentMessageDailySummary.findFirst({
                where: {
                    companyId: company.id,
                    date: targetDate
                }
            });

            if (!summaryExists) {
                // Check if there's actual data in raw stats before trying to aggregate
                const hasRawData = await prisma.sentMessageStat.findFirst({
                    where: {
                        companyId: company.id,
                        sentAt: { gte: targetDate, lte: endOfDay(targetDate) }
                    }
                });

                if (hasRawData) {
                    console.log(`⚠️ [GAP-FOUND] Missing summary for ${company.name} on ${format(targetDate, 'yyyy-MM-dd')}. Fixing...`);
                    try {
                        await aggregateCompanyStats(company.id, targetDate);
                    } catch (e) {
                        console.error(`❌ Failed to fix gap for ${company.name}:`, e.message);
                    }
                }
            }
        }
    }
}

/**
 * Main runner
 */
async function runAggregation(daysBack = 1, forceGapCheck = true) {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        // 1. Regular aggregation for recent days
        const companies = await prisma.company.findMany({ select: { id: true, name: true } });
        console.log(`🚀 Starting aggregation for ${companies.length} companies...`);

        for (let i = 1; i <= daysBack; i++) {
            const targetDate = subDays(new Date(), i);
            console.log(`📅 Processing Date: ${format(targetDate, 'yyyy-MM-dd')}`);

            for (const company of companies) {
                try {
                    await aggregateCompanyStats(company.id, targetDate);
                } catch (compError) {
                    console.error(`❌ Error in company ${company.name} (${company.id}):`, compError.message);
                }
            }
        }

        // 2. Self-healing: Discover and fix gaps in the last 30 days
        if (forceGapCheck) {
            await discoverAndFixGaps(30);
        }

        console.log('✅ All aggregations and gap checks completed.');
    } catch (error) {
        console.error('❌ Global aggregation failure:', error);
    }
}

// Support command line execution
if (require.main === module) {
    const days = process.argv[2] ? parseInt(process.argv[2]) : 1;
    runAggregation(days).then(() => {
        console.log('🏁 Process finished.');
        process.exit(0);
    }).catch(err => {
        console.error('💥 Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { runAggregation, aggregateCompanyStats };
