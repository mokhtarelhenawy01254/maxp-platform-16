/**
 * conversationStatsController.js
 * الإحصائيات والتوقعات
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const fs = require('fs');
const path = require('path');

const DEBUG_LOG_PATH = path.join(__dirname, '../../stats_debug.log');

function logToDebugFile(message, data = null) {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [CONTROLLER] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
        fs.appendFileSync(DEBUG_LOG_PATH, logEntry);
    } catch (e) {
        // console.error('Failed to write to debug log:', e);
    }
}

// Get conversation statistics
const getConversationStats = async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const prisma = getSharedPrismaClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. عدد المحادثات الجديدة (التي لم يتم الرد عليها)
        const newConversations = await prisma.conversation.count({
            where: {
                companyId: companyId,
                status: { not: 'RESOLVED' },
                // المحادثات التي آخر رسالة فيها من العميل
                // سنستخدم metadata أو نفحص lastMessage
                // للبساطة، سنستخدم unreadCount > 0 أو نفحص الرسائل
                unreadCount: { gt: 0 }
            }
        });

        // طريقة أخرى: عد المحادثات التي آخر رسالة فيها من العميل
        // سنحتاج إلى فحص الرسائل الأخيرة
        const allActiveConversations = await prisma.conversation.findMany({
            where: {
                companyId: companyId,
                status: { not: 'RESOLVED' }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        isFromCustomer: true,
                        createdAt: true
                    }
                }
            }
        });

        // عد المحادثات التي آخر رسالة فيها من العميل (جديدة)
        let newConversationsCount = 0;
        allActiveConversations.forEach(conv => {
            if (conv.messages.length > 0 && conv.messages[0].isFromCustomer) {
                newConversationsCount++;
            }
        });

        // 2. عدد المحادثات التي رد عليها كل موظف اليوم
        const todayMessages = await prisma.message.findMany({
            where: {
                conversation: {
                    companyId: companyId
                },
                isFromCustomer: false,
                senderId: { not: null }, // فقط الرسائل من الموظفين
                createdAt: {
                    gte: today
                }
            },
            select: {
                conversationId: true,
                senderId: true,
                metadata: true,
                createdAt: true
            }
        });

        // تجميع المحادثات الفريدة لكل موظف
        const employeeReplies = {};

        for (const msg of todayMessages) {
            let employeeId = msg.senderId;
            let employeeName = 'غير معروف';

            // محاولة استخراج اسم الموظف من metadata
            if (msg.metadata) {
                try {
                    const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                    if (metadata.employeeId) employeeId = metadata.employeeId;
                    if (metadata.employeeName) employeeName = metadata.employeeName;
                } catch (e) {
                    // ignore
                }
            }

            // جلب اسم الموظف من قاعدة البيانات إذا لم يكن موجوداً في metadata
            if (!employeeReplies[employeeId]) {
                try {
                    const user = await prisma.user.findUnique({
                        where: { id: employeeId },
                        select: { firstName: true, lastName: true, email: true }
                    });
                    if (user) {
                        employeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'غير معروف';
                    }
                } catch (e) {
                    // ignore
                }
                employeeReplies[employeeId] = {
                    name: employeeName,
                    count: 0,
                    conversationIds: new Set()
                };
            }

            // إضافة المحادثة إلى مجموعة الموظف (فقط مرة واحدة لكل محادثة)
            employeeReplies[employeeId].conversationIds.add(msg.conversationId);
        }

        // حساب العدد النهائي لكل موظف
        const employeeStats = Object.entries(employeeReplies).map(([id, data]) => ({
            employeeId: id,
            employeeName: data.name,
            conversationsRepliedTo: data.conversationIds.size
        })).sort((a, b) => b.conversationsRepliedTo - a.conversationsRepliedTo);

        res.json({
            success: true,
            data: {
                newConversationsCount,
                employeeRepliesToday: employeeStats,
                totalEmployeesReplied: employeeStats.length,
                date: today.toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Error getting conversation stats:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'فشل في جلب الإحصائيات'
        });
    }
};

// Get historical data for campaign prediction
const getHistoricalPredictionData = async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const prisma = getSharedPrismaClient();
        const period = 90; // Last 90 days for historical data

        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - period);
        dateFrom.setHours(0, 0, 0, 0);
        dateTo.setHours(23, 59, 59, 999);

        console.log(`📊 [PREDICTION DATA] جلب بيانات التوقع لشركة: ${companyId}, الفترة: ${period} يوم`);

        // Get daily historical data
        const dailySummaries = await prisma.sentMessageDailySummary.findMany({
            where: {
                companyId: companyId,
                date: { gte: dateFrom, lte: dateTo }
            },
            orderBy: { date: 'asc' }
        });

        // Get hourly pattern from raw stats (last 30 days for recent patterns)
        const recentDateFrom = new Date();
        recentDateFrom.setDate(recentDateFrom.getDate() - 30);
        recentDateFrom.setHours(0, 0, 0, 0);

        const rawStats = await prisma.sentMessageStat.findMany({
            where: {
                companyId: companyId,
                sentAt: { gte: recentDateFrom, lte: dateTo }
            },
            select: {
                sentAt: true,
                messageStatus: true,
                conversationStatus: true
            }
        });

        // Calculate hourly metrics
        const hourlyData = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = {
                hour: hour,
                total: 0,
                saved: 0,
                converted: 0
            };
        }

        rawStats.forEach(stat => {
            const hour = new Date(stat.sentAt).getHours();
            hourlyData[hour].total++;

            if (stat.messageStatus === 'saved') {
                hourlyData[hour].saved++;
            }

            if (stat.conversationStatus === 'created') {
                hourlyData[hour].converted++;
            }
        });

        // Calculate average metrics
        let totalSent = 0;
        let totalSaved = 0;
        let totalConverted = 0;
        let totalRevenue = 0;
        let totalOrderCount = 0;

        dailySummaries.forEach(summary => {
            totalSent += summary.totalSent;
            totalSaved += summary.totalSaved;
            totalConverted += summary.conversationsCreated;
            totalRevenue += parseFloat(summary.totalRevenue.toString());
            totalOrderCount += summary.orderCount;
        });

        const averageSavedRate = totalSent > 0 ? parseFloat(((totalSaved / totalSent) * 100).toFixed(1)) : 35;
        const averageConversionRate = totalSaved > 0 ? parseFloat(((totalConverted / totalSaved) * 100).toFixed(1)) : 12;
        const averageRevenuePerConversation = totalConverted > 0 ? parseFloat((totalRevenue / totalConverted).toFixed(0)) : 85;

        // Calculate peak hour and best day
        let peakHour = 20; // Default to 8 PM
        let maxHourlyRate = 0;

        for (let hour = 0; hour < 24; hour++) {
            if (hourlyData[hour].total > 0) {
                const savedRate = (hourlyData[hour].saved / hourlyData[hour].total) * 100;
                const conversionRate = (hourlyData[hour].converted / hourlyData[hour].saved) * 100;
                const effectiveness = savedRate * conversionRate;

                if (effectiveness > maxHourlyRate) {
                    maxHourlyRate = effectiveness;
                    peakHour = hour;
                }
            }
        }

        // Calculate best day of week
        const weekdayData = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
        dailySummaries.forEach(summary => {
            const day = new Date(summary.date).getDay();
            weekdayData[day] += summary.totalSent;
        });

        const bestDay = weekdayData.indexOf(Math.max(...weekdayData));

        // Prepare daily trend data
        const dailyTrend = dailySummaries.map(summary => {
            const savedRate = (summary.totalSaved / summary.totalSent) * 100;
            const conversionRate = (summary.conversationsCreated / summary.totalSaved) * 100;

            return {
                date: summary.date.toISOString().split('T')[0],
                savedRate: parseFloat(savedRate.toFixed(1)),
                conversionRate: parseFloat(conversionRate.toFixed(1)),
                revenue: parseFloat(summary.totalRevenue.toString())
            };
        });

        // Prepare hourly pattern data
        const hourlyPattern = Object.values(hourlyData).map(hourData => {
            const savedRate = hourData.total > 0 ? (hourData.saved / hourData.total) * 100 : 0;
            const conversionRate = hourData.saved > 0 ? (hourData.converted / hourData.saved) * 100 : 0;

            return {
                hour: hourData.hour,
                savedRate: parseFloat(savedRate.toFixed(1)),
                conversionRate: parseFloat(conversionRate.toFixed(1))
            };
        });

        const result = {
            averageSavedRate: averageSavedRate,
            averageConversionRate: averageConversionRate,
            averageRevenuePerConversation: averageRevenuePerConversation,
            peakHour: peakHour,
            bestDay: bestDay,
            dailyTrend: dailyTrend,
            hourlyPattern: hourlyPattern
        };

        console.log(`✅ [PREDICTION DATA] تم جلب البيانات التاريخية بنجاح`);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Error fetching historical prediction data:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

// Get sent messages statistics (saved/ignored messages and conversations)
const getSentMessagesStats = async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        logToDebugFile('getSentMessagesStats request', { companyId, query: req.query });

        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const {
            period = '7d',
            startDate,
            endDate,
            pageIds,
            messageStatus,
            conversationStatus,
            includeComparison = 'true'
        } = req.query;

        // --- 1. Input Validation & Date Calculation ---
        const validPeriods = ['today', '1d', '1', 'yesterday', '7d', '30d', '90d'];
        if (period && !validPeriods.includes(period)) {
            return res.status(400).json({ success: false, error: 'INVALID_PERIOD', message: 'الفترة المحددة غير صالحة' });
        }

        if (pageIds) {
            const ids = pageIds.split(',').map(id => id.trim()).filter(Boolean);
            const invalidIds = ids.filter(id => !/^[a-zA-Z0-9_-]+$/.test(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({ success: false, error: 'INVALID_PAGE_IDS', message: 'معرفات الصفحات تحتوي على رموز غير صالحة' });
            }
        }

        // --- Calculate Dates ---
        let dateFrom, dateTo;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
        } else {
            // Default to period logic
            dateTo = now;
            switch (period) {
                case 'today':
                case '1d':
                case '1':
                    dateFrom = startOfToday;
                    break;
                case 'yesterday':
                    dateFrom = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
                    dateTo = new Date(startOfToday.getTime() - 1);
                    break;
                case '7d':
                    dateFrom = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    dateFrom = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    dateFrom = new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    dateFrom = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
        }

        // --- 2. Split into Historical and Live (Today) ---
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const isTodayInRange = dateTo >= todayStart;

        let histTo = new Date(dateTo);
        if (isTodayInRange) {
            histTo = new Date(todayStart.getTime() - 1); // Up to end of yesterday
        }

        const hasHistoricalRange = dateFrom <= histTo;
        const pageIdsArray = pageIds ? pageIds.split(',').map(id => id.trim()).filter(Boolean) : [];
        const prisma = getSharedPrismaClient();

        // Containers for merged results
        let totalSent = 0;
        let totalSaved = 0;
        let totalIgnored = 0;
        let totalRevenue = 0;
        let totalOrderCount = 0;
        let conversationsCreated = 0;
        let conversationsExisted = 0;
        let conversationsIgnored = 0; // Legacy if needed, but we use reach now
        let savedReach = 0;
        let ignoredReach = 0;

        const dailyMap = {}; // Keyed by date YYYY-MM-DD
        const hourlyMap = {}; // Only for today
        const pageCountMap = {}; // Keyed by pageId

        // --- 3. Fetch Historical Data from Daily Summaries ---
        if (hasHistoricalRange) {
            const histSummary = await prisma.sentMessageDailySummary.findMany({
                where: {
                    companyId,
                    date: { gte: dateFrom, lte: histTo },
                    ...(pageIdsArray.length > 0 ? { facebookPageId: { in: pageIdsArray } } : {})
                }
            });

            histSummary.forEach(s => {
                const dateKey = s.date.toISOString().split('T')[0];
                if (!dailyMap[dateKey]) {
                    dailyMap[dateKey] = {
                        date: dateKey, total: 0, saved: 0, ignored: 0, revenue: 0,
                        orderCount: 0, conversationsCreated: 0, conversationsExisted: 0,
                        conversationsIgnored: 0, savedReach: 0, ignoredReach: 0
                    };
                }

                // Filtering by status if requested
                const isMsgMatch = !messageStatus || messageStatus === 'all' ||
                    (messageStatus === 'saved' && s.totalSaved > 0) ||
                    (messageStatus === 'ignored' && s.totalIgnored > 0);

                const isConvMatch = !conversationStatus || conversationStatus === 'all' ||
                    (conversationStatus === 'created' && s.conversationsCreated > 0) ||
                    (conversationStatus === 'existed' && s.conversationsExisted > 0);

                if (isMsgMatch && isConvMatch) {
                    const rowSent = (messageStatus === 'saved') ? s.totalSaved :
                        (messageStatus === 'ignored') ? s.totalIgnored : s.totalSent;

                    totalSent += rowSent;
                    totalSaved += s.totalSaved;
                    totalIgnored += s.totalIgnored;
                    totalRevenue += parseFloat(s.totalRevenue.toString());
                    totalOrderCount += s.orderCount;
                    conversationsCreated += s.conversationsCreated;
                    conversationsExisted += s.conversationsExisted;
                    savedReach += s.savedReach || 0;
                    ignoredReach += s.ignoredReach || 0;

                    dailyMap[dateKey].total += rowSent;
                    dailyMap[dateKey].saved += s.totalSaved;
                    dailyMap[dateKey].ignored += s.totalIgnored;
                    dailyMap[dateKey].revenue += parseFloat(s.totalRevenue.toString());
                    dailyMap[dateKey].orderCount += s.orderCount;
                    dailyMap[dateKey].conversationsCreated += s.conversationsCreated;
                    dailyMap[dateKey].conversationsExisted += s.conversationsExisted;
                    dailyMap[dateKey].savedReach += s.savedReach || 0;
                    dailyMap[dateKey].ignoredReach += s.ignoredReach || 0;

                    if (s.facebookPageId) {
                        pageCountMap[s.facebookPageId] = (pageCountMap[s.facebookPageId] || 0) + rowSent;
                    }
                }
            });
        }

        // --- 4. Fetch Live Data for "Today" from Raw Tables ---
        if (isTodayInRange) {
            const liveStart = todayStart > dateFrom ? todayStart : dateFrom;
            const liveEnd = dateTo;

            const liveFilter = {
                companyId,
                sentAt: { gte: liveStart, lte: liveEnd },
                ...(pageIdsArray.length > 0 ? { facebookPageId: { in: pageIdsArray } } : {}),
                ...(messageStatus && messageStatus !== 'all' ? { messageStatus } : {}),
                ...(conversationStatus && conversationStatus !== 'all' ? { conversationStatus } : {})
            };

            // 🚀 OPTIMIZATION: Use specialized raw queries for unique reach to avoid heavy Prisma groupBy
            const [msgStats, convStats, revenueAgg, reachStats] = await Promise.all([
                prisma.sentMessageStat.groupBy({
                    by: ['messageStatus', 'facebookPageId'],
                    where: liveFilter,
                    _count: { id: true }
                }),
                prisma.sentMessageStat.groupBy({
                    by: ['conversationStatus'],
                    where: liveFilter,
                    _count: { id: true }
                }),
                prisma.$queryRawUnsafe(`
                    SELECT SUM(o."total") as "revenue", COUNT(o."id") as "count"
                    FROM "orders" o
                    WHERE o."companyId" = $1 AND o."createdAt" BETWEEN $2 AND $3
                    AND o."conversationId" IN (
                        SELECT "conversationId" FROM "sent_message_stats"
                        WHERE "companyId" = $1 AND "sentAt" BETWEEN $2 AND $3
                        ${pageIdsArray.length > 0 ? 'AND "facebookPageId" = ANY($4)' : ''}
                    )
                `, companyId, liveStart, liveEnd, ...(pageIdsArray.length > 0 ? [pageIdsArray] : [])),
                // ⚡ FASTER REACH CALCULATION
                prisma.$queryRawUnsafe(`
                    SELECT 
                        COUNT(DISTINCT CASE WHEN "messageStatus" = 'saved' THEN "recipientFacebookId" END) as "savedReach",
                        COUNT(DISTINCT CASE WHEN "messageStatus" = 'ignored' THEN "recipientFacebookId" END) as "ignoredReach"
                    FROM "sent_message_stats"
                    WHERE "companyId" = $1 AND "sentAt" BETWEEN $2 AND $3
                    ${pageIdsArray.length > 0 ? 'AND "facebookPageId" = ANY($4)' : ''}
                    ${messageStatus && messageStatus !== 'all' ? 'AND "messageStatus" = $5' : ''}
                `, companyId, liveStart, liveEnd,
                    ...(pageIdsArray.length > 0 ? [pageIdsArray] : []),
                    ...(messageStatus && messageStatus !== 'all' ? [messageStatus] : [])
                )
            ]);

            const todaySavedReach = parseInt(reachStats[0]?.savedReach || 0);
            const todayIgnoredReach = parseInt(reachStats[0]?.ignoredReach || 0);

            const todayKey = todayStart.toISOString().split('T')[0];
            if (!dailyMap[todayKey]) {
                dailyMap[todayKey] = {
                    date: todayKey, total: 0, saved: 0, ignored: 0, revenue: 0,
                    orderCount: 0, conversationsCreated: 0, conversationsExisted: 0,
                    conversationsIgnored: 0, savedReach: 0, ignoredReach: 0
                };
            }

            savedReach += todaySavedReach;
            ignoredReach += todayIgnoredReach;
            dailyMap[todayKey].savedReach += todaySavedReach;
            dailyMap[todayKey].ignoredReach += todayIgnoredReach;

            msgStats.forEach(s => {
                const count = s._count.id;
                totalSent += count;
                dailyMap[todayKey].total += count;

                if (s.messageStatus === 'saved') {
                    totalSaved += count;
                    dailyMap[todayKey].saved += count;
                } else {
                    totalIgnored += count;
                    dailyMap[todayKey].ignored += count;
                }
                if (s.facebookPageId) {
                    pageCountMap[s.facebookPageId] = (pageCountMap[s.facebookPageId] || 0) + s._count.id;
                }
            });

            convStats.forEach(s => {
                if (s.conversationStatus === 'created') {
                    conversationsCreated += s._count.id;
                    dailyMap[todayKey].conversationsCreated += s._count.id;
                } else if (s.conversationStatus === 'existed') {
                    conversationsExisted += s._count.id;
                    dailyMap[todayKey].conversationsExisted += s._count.id;
                }
            });

            const rev = parseFloat(revenueAgg[0]?.revenue || 0);
            const count = parseInt(revenueAgg[0]?.count || 0);
            totalRevenue += rev;
            totalOrderCount += count;
            dailyMap[todayKey].revenue += rev;
            dailyMap[todayKey].orderCount += count;

            const hourlyRaw = await prisma.$queryRawUnsafe(`
                SELECT EXTRACT(HOUR FROM "sentAt")::int as "hour", "messageStatus", COUNT(*)::int as "count"
                FROM "sent_message_stats"
                WHERE "companyId" = $1 AND "sentAt" BETWEEN $2 AND $3
                ${pageIdsArray.length > 0 ? 'AND "facebookPageId" = ANY($4)' : ''}
                GROUP BY 1, 2 ORDER BY 1
            `, companyId, liveStart, liveEnd, ...(pageIdsArray.length > 0 ? [pageIdsArray] : []));

            hourlyRaw.forEach(h => {
                if (!hourlyMap[h.hour]) {
                    hourlyMap[h.hour] = { hour: h.hour, count: 0, saved: 0, ignored: 0, revenue: 0, orderCount: 0 };
                }
                hourlyMap[h.hour].count += h.count;
                if (h.messageStatus === 'saved') {
                    hourlyMap[h.hour].saved += h.count;
                } else {
                    hourlyMap[h.hour].ignored += h.count;
                }
            });
        }

        // --- 5. Prepare Response ---
        const pages = await prisma.facebookPage.findMany({
            where: { pageId: { in: Object.keys(pageCountMap) }, companyId },
            select: { pageId: true, pageName: true }
        });
        const pageNameMap = pages.reduce((acc, p) => ({ ...acc, [p.pageId]: p.pageName }), {});

        res.json({
            success: true,
            data: {
                summary: {
                    messages: {
                        totalSent, totalSaved, totalIgnored,
                        savedPercentage: totalSent > 0 ? ((totalSaved / totalSent) * 100).toFixed(2) : (totalSaved > 0 ? 100 : 0),
                        ignoredPercentage: (totalSaved + totalIgnored) > 0 ? ((totalIgnored / (totalSaved + totalIgnored)) * 100).toFixed(2) : 0,
                        conversionRate: totalSent > 0 ? ((conversationsCreated / totalSent) * 100).toFixed(2) : 0
                    },
                    conversations: {
                        reached: savedReach,
                        ignored: ignoredReach,
                        created: conversationsCreated,
                        existed: conversationsExisted,
                        total: conversationsCreated + conversationsExisted
                    },
                    revenue: { totalRevenue, totalOrderCount, avgRevenuePerMessage: totalSent > 0 ? (totalRevenue / totalSent).toFixed(2) : 0 }
                },
                dailyStats: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
                hourlyStats: Object.values(hourlyMap).sort((a, b) => a.hour - b.hour),
                pageStats: Object.entries(pageCountMap).map(([id, count]) => ({
                    pageId: id, pageName: pageNameMap[id] || 'غير محدد', count,
                    percentage: totalSent > 0 ? ((count / totalSent) * 100).toFixed(2) : 0
                })).sort((a, b) => b.count - a.count),
                period: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
            }
        });

    } catch (error) {
        console.error('❌ [SENT MSGS STATS] Error:', error);
        logToDebugFile('getSentMessagesStats error', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || 'فشل في جلب الإحصائيات'
        });
    }
};

module.exports = {
    getConversationStats,
    getSentMessagesStats,
    getHistoricalPredictionData
};
