
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkStats() {
    try {
        console.log('Checking SentMessageStat (Live Data)...');
        const statsCount = await prisma.sentMessageStat.count();
        console.log(`Total SentMessageStat records: ${statsCount}`);

        if (statsCount > 0) {
            const byStatus = await prisma.sentMessageStat.groupBy({
                by: ['messageStatus'],
                _count: { id: true }
            });
            console.log('SentMessageStat by Status:', byStatus);

            const recent = await prisma.sentMessageStat.findMany({
                take: 5,
                orderBy: { sentAt: 'desc' },
                include: {
                    conversation: {
                        select: { companyId: true }
                    }
                }
            });
            console.log('Recent 5 records:', JSON.stringify(recent, null, 2));
        }

        console.log('\nChecking SentMessageDailySummary (Historical Data)...');
        const summaryCount = await prisma.sentMessageDailySummary.count();
        console.log(`Total SentMessageDailySummary records: ${summaryCount}`);

        if (summaryCount > 0) {
            const summaryRecent = await prisma.sentMessageDailySummary.findMany({
                take: 5,
                orderBy: { date: 'desc' }
            });
            console.log('Recent 5 summaries:', summaryRecent);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStats();
