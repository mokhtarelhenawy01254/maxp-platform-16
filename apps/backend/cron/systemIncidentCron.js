/**
 * ⏰ System Incident & Health Monitoring Cron
 * فحص دوري ذكي لرصد توقف الأوردرات وركود المبيعات وتوقف الإعلانات
 * يعمل كل 30 دقيقة
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const systemIncidentAlertService = require('../services/systemIncidentAlertService');

let schedulerTask = null;
let isScanRunning = false;

// فترات السكون وأوقات الذروة
const SILENCE_THRESHOLD_HOURS = 8; // عدد ساعات عدم نزول أي طلب لاعتبارها مشكلة
const MIN_WEEKLY_ORDERS_TO_MONITOR = 15; // الشركات النشطة التي ينزل لها أوردرات بانتظام

/**
 * فحص ركود الأوردرات (Order Stoppage / Silence Scanner)
 * يكتشف المتاجر التي تعمل والتي انقطعت عنها الطلبات فجأة
 */
async function scanOrderSilence(prisma, now = new Date()) {
    try {
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const silenceCutoff = new Date(now.getTime() - (SILENCE_THRESHOLD_HOURS * 60 * 60 * 1000));

        // التحقق من الوقت الحالي بتوقيت القاهرة (نتجنب التنبيه في منتصف الليل 00:00 - 09:00)
        const currentHourCairo = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })).getHours();
        const isNightTime = currentHourCairo >= 1 && currentHourCairo < 10;
        if (isNightTime) {
            return { checked: 0, alerts: 0, skippedReason: 'night_hours' };
        }

        // 1. جلب الشركات التي لديها نشاط طلبات في الأسبوع الماضي (>= 15 طلب)
        const activeCompanies = await prisma.order.groupBy({
            by: ['companyId'],
            where: {
                createdAt: { gte: sevenDaysAgo }
            },
            _count: {
                id: true
            },
            having: {
                id: {
                    _count: { gte: MIN_WEEKLY_ORDERS_TO_MONITOR }
                }
            }
        });

        if (!activeCompanies.length) {
            return { checked: 0, alerts: 0 };
        }

        let alertsDispatched = 0;

        for (const companyGroup of activeCompanies) {
            const companyId = companyGroup.companyId;

            // آخر طلب تم إنشاؤه في هذه الشركة
            const latestOrder = await prisma.order.findFirst({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, orderNumber: true }
            });

            if (!latestOrder) continue;

            const latestCreatedAt = new Date(latestOrder.createdAt);
            const hoursSinceLastOrder = (now.getTime() - latestCreatedAt.getTime()) / (1000 * 60 * 60);

            // لو مر أكثر من SILENCE_THRESHOLD_HOURS ساعات في أوقات العمل بدون أي أوردر
            if (hoursSinceLastOrder >= SILENCE_THRESHOLD_HOURS) {
                const roundedHours = Math.round(hoursSinceLastOrder);

                const result = await systemIncidentAlertService.dispatchIncident({
                    companyId,
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
                    title: `⚠️ توقف نزول الأوردرات منذ ${roundedHours} ساعة`,
                    message: `لم يتم تسجيل أو استيراد أي طلبات جديدة منذ ${roundedHours} ساعة في متجرك (آخر طلب: #${latestOrder.orderNumber}). يرجى التأكد من عمل المتجر وروابط الإعلانات وبوابات الدفع.`,
                    severity: systemIncidentAlertService.SEVERITIES.WARNING,
                    entityId: companyId,
                    url: '/orders',
                    cooldownMinutes: 180, // تكرار كل 3 ساعات فقط للركود
                    metadata: {
                        lastOrderNumber: latestOrder.orderNumber,
                        hoursSinceLastOrder: roundedHours,
                        weeklyOrdersCount: companyGroup._count.id
                    }
                });

                if (result.sent) alertsDispatched++;
            }
        }

        return { checked: activeCompanies.length, alerts: alertsDispatched };
    } catch (error) {
        console.error('❌ [SYSTEM-INCIDENT-CRON] Order silence scan failed:', error.message);
        return { checked: 0, alerts: 0, error: error.message };
    }
}

/**
 * فحص الحسابات الإعلانية ومشاكل الإعلانات المتوقفة
 */
async function scanAdAccountsHealth(prisma) {
    try {
        // الحسابات الإعلانية النشطة المسجلة
        const adAccounts = await prisma.facebookAdAccount.findMany({
            where: { isActive: true },
            select: {
                id: true,
                companyId: true,
                accountId: true,
                name: true,
                settings: true
            }
        });

        let alertsDispatched = 0;

        for (const account of adAccounts) {
            // الحسابات المعطلة أو التي بها مشاكل فواتير
            // status: 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW, 100 = PENDING_CLOSURE
            const rawStatus = account.settings?.account_status ?? account.settings?.status;
            const badStatuses = [2, 3, 7, 8, 9, 100, 'DISABLED', 'UNSETTLED', 'PENDING_RISK_REVIEW'];
            if (badStatuses.includes(rawStatus)) {
                const result = await systemIncidentAlertService.dispatchIncident({
                    companyId: account.companyId,
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.AD_ACCOUNT_ISSUE,
                    title: `🚨 الحساب الإعلاني متوقف (${account.name || account.accountId})`,
                    message: `تم رصد توقف أو تعطيل بالحساب الإعلاني ${account.name || account.accountId}. يرجى مراجعة إعدادات الدفع وحالة الحساب في مدير إعلانات Meta فوراً لتجنب توقف الحملات.`,
                    severity: systemIncidentAlertService.SEVERITIES.CRITICAL,
                    entityId: account.id,
                    url: '/facebook-ads',
                    cooldownMinutes: 120, // كل ساعتين
                    metadata: {
                        accountId: account.accountId,
                        accountStatus: account.status
                    }
                });
                if (result.sent) alertsDispatched++;
            }
        }

        return { checked: adAccounts.length, alerts: alertsDispatched };
    } catch (error) {
        console.error('❌ [SYSTEM-INCIDENT-CRON] Ad accounts scan failed:', error.message);
        return { checked: 0, alerts: 0, error: error.message };
    }
}

/**
 * تشغيل دورة الفحص الشاملة
 */
async function runSystemIncidentCheck() {
    if (isScanRunning) {
        console.log('⚠️ [SYSTEM-INCIDENT-CRON] Previous scan still running, skipping');
        return;
    }

    isScanRunning = true;
    const prisma = getSharedPrismaClient();

    try {
        console.log('🔍 [SYSTEM-INCIDENT-CRON] Running system health & incident scan...');
        const [ordersResult, adsResult] = await Promise.all([
            scanOrderSilence(prisma),
            scanAdAccountsHealth(prisma)
        ]);

        if (ordersResult.alerts > 0 || adsResult.alerts > 0) {
            console.log(`🚨 [SYSTEM-INCIDENT-CRON] Scan complete. Dispatched: ${ordersResult.alerts} order alerts, ${adsResult.alerts} ad alerts.`);
        }
    } catch (err) {
        console.error('❌ [SYSTEM-INCIDENT-CRON] Scan cycle error:', err.message);
    } finally {
        isScanRunning = false;
    }
}

/**
 * بدء الجدولة
 */
function startSystemIncidentCron() {
    if (schedulerTask) return schedulerTask;

    if (process.env.SYSTEM_INCIDENT_CRON === 'false') {
        console.log('ℹ️ [SYSTEM-INCIDENT-CRON] Disabled by environment variable');
        return null;
    }

    // تشغيل أول فحص بعد 60 ثانية من إقلاع السيرفر
    setTimeout(() => {
        runSystemIncidentCheck().catch(() => {});
    }, 60000);

    // جدولة كل 30 دقيقة
    schedulerTask = cron.schedule('*/30 * * * *', async () => {
        await runSystemIncidentCheck();
    });

    console.log('✅ [SYSTEM-INCIDENT-CRON] System Incident Cron started (runs every 30 minutes)');
    return schedulerTask;
}

function stopSystemIncidentCron() {
    if (schedulerTask) {
        schedulerTask.stop();
        schedulerTask = null;
    }
}

module.exports = {
    startSystemIncidentCron,
    stopSystemIncidentCron,
    runSystemIncidentCheck,
    scanOrderSilence,
    scanAdAccountsHealth
};
