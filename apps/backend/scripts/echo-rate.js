
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function checkEchoRate() {
    const companyId = 'cmlc7s6kh000iju40ei73ez36';
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
        console.log(`--- Echo Rate Analysis for Flora ---`);
        console.log(`Period: Last 60 minutes`);

        const stats = await prisma.sentMessageStat.findMany({
            where: {
                companyId,
                sentAt: { gte: oneHourAgo }
            },
            select: { sentAt: true }
        });

        if (stats.length === 0) {
            console.log('No messages found in the last hour.');
            return;
        }

        // Group by minute
        const minuteBuckets = {};
        stats.forEach(s => {
            const min = new Date(s.sentAt);
            min.setSeconds(0, 0);
            const key = min.toISOString();
            minuteBuckets[key] = (minuteBuckets[key] || 0) + 1;
        });

        const counts = Object.values(minuteBuckets);
        const totalMessages = stats.length;
        const avgPerMin = (totalMessages / 60).toFixed(2);
        const maxPerMin = Math.max(...counts);
        const activeMinutes = counts.length;

        console.log(`\nTotal messages in last hour: ${totalMessages}`);
        console.log(`Average messages/min (across full hour): ${avgPerMin}`);
        if (activeMinutes > 0) {
            console.log(`Average messages/min (during active burst): ${(totalMessages / activeMinutes).toFixed(2)}`);
        }
        console.log(`Peak messages/min: ${maxPerMin}`);

        console.log('\n--- Hourly Breakdown (Today) ---');
        const hourlyStats = await prisma.$queryRawUnsafe(`
            SELECT DATE_TRUNC('hour', "sentAt") as bucket, COUNT(*)::int as cnt
            FROM "sent_message_stats"
            WHERE "companyId" = 'cmlc7s6kh000iju40ei73ez36'
            AND "sentAt" >= DATE_TRUNC('day', NOW())
            GROUP BY 1
            ORDER BY 1 ASC
        `);

        hourlyStats.forEach(h => {
            const time = new Date(h.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const perMinInHour = (h.cnt / 60).toFixed(2);
            console.log(`${time}: ${h.cnt} messages (~${perMinInHour}/min)`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkEchoRate();

