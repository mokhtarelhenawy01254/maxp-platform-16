require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkIgnoredStats() {
    const prisma = getSharedPrismaClient();
    try {
        console.log('--- Checking SentMessageStat (Raw Data) ---');

        // 1. Check Total Ignored
        const totalIgnored = await prisma.sentMessageStat.count({ where: { messageStatus: 'ignored' } });
        console.log(`Total Ignored (All Time): ${totalIgnored}`);

        // 2. Check Ignored TODAY
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const ignoredToday = await prisma.sentMessageStat.count({
            where: {
                messageStatus: 'ignored',
                sentAt: { gte: startOfToday }
            }
        });
        console.log(`Ignored Today (${startOfToday.toISOString()}): ${ignoredToday}`);

        // 3. Check Ignored Yesterday
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const ignoredYesterday = await prisma.sentMessageStat.count({
            where: {
                messageStatus: 'ignored',
                sentAt: { gte: startOfYesterday, lt: startOfToday }
            }
        });
        console.log(`Ignored Yesterday: ${ignoredYesterday}`);

        console.log('\n--- Checking SentMessageDailySummary (Pre-aggregated Data) ---');

        // 4. Check Daily Summary Table
        const summaryCount = await prisma.sentMessageDailySummary.count();
        console.log(`Total Daily Summary Rows: ${summaryCount}`);

        const summaryIgnored = await prisma.sentMessageDailySummary.aggregate({
            _sum: { totalIgnored: true }
        });
        console.log(`Total Ignored in Summaries: ${summaryIgnored._sum.totalIgnored || 0}`);

        // 5. Check specific summary for Feb 17 (where we saw ignored messages)
        const specificSummary = await prisma.sentMessageDailySummary.findFirst({
            where: { date: { equals: new Date('2026-02-17') } }
        });
        console.log('Summary for 2026-02-17:', specificSummary);

    } catch (error) {
        console.error('Error checking stats:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkIgnoredStats();

