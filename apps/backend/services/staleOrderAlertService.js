/**
 * ⏰ Stale Order Alert Service
 *
 * 2026-09-23: WISMO ("فين أوردي؟") is the #1 support ticket category and the
 * highest-ROI proactive automation (2026 customer-support research). This
 * scanner flags orders stuck in an active status for 48h+ and notifies the
 * MERCHANT (not the customer — outbound customer messaging is the merchant's
 * opt-in decision) so nobody waits 6 days in silence like the Swan/Doaa case.
 *
 * Dedupe: one notification per company per 7 days (checked against the
 * notifications table by type + data sample).
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'];
const STALE_AFTER_HOURS = 48;
const SCAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const NOTIFICATION_DEDUPE_DAYS = 7;
const MAX_COMPANIES_PER_SCAN = 100;
const SAMPLE_SIZE = 5;

/**
 * Pure selection logic (unit-tested): group stale orders per company.
 * @param {Array<{id, companyId, orderNumber, customerName, createdAt}>} orders
 * @param {Date} now
 */
const selectStaleByCompany = (orders, now = new Date()) => {
    const cutoff = new Date(now.getTime() - STALE_AFTER_HOURS * 3600 * 1000);
    const byCompany = new Map();

    for (const order of orders || []) {
        if (!order || !order.companyId) continue;
        const createdAt = order.createdAt ? new Date(order.createdAt) : null;
        if (!createdAt || createdAt > cutoff) continue;
        if (!byCompany.has(order.companyId)) {
            byCompany.set(order.companyId, []);
        }
        byCompany.get(order.companyId).push(order);
    }
    return byCompany;
};

const scanStaleOrders = async () => {
    const prisma = getSharedPrismaClient();
    const now = new Date();

    const staleOrders = await prisma.order.findMany({
        where: {
            status: { in: ACTIVE_STATUSES },
            createdAt: { lt: new Date(now.getTime() - STALE_AFTER_HOURS * 3600 * 1000) }
        },
        select: {
            id: true,
            companyId: true,
            orderNumber: true,
            customerName: true,
            createdAt: true
        },
        orderBy: { createdAt: 'asc' },
        take: 500
    });

    if (!staleOrders.length) {
        return { companiesNotified: 0, staleOrders: 0 };
    }

    const byCompany = selectStaleByCompany(staleOrders, now);
    let companiesNotified = 0;
    let companyIndex = 0;

    for (const [companyId, orders] of byCompany) {
        if (companyIndex >= MAX_COMPANIES_PER_SCAN) break;
        companyIndex += 1;

        const dedupeKeySample = orders[0]?.orderNumber || '';
        const recentDuplicate = await prisma.notification.findFirst({
            where: {
                companyId,
                type: 'stale_preparing_orders',
                createdAt: { gte: new Date(now.getTime() - NOTIFICATION_DEDUPE_DAYS * 24 * 3600 * 1000) },
                data: { path: ['sampleOrderNumber'], equals: dedupeKeySample }
            }
        });
        if (recentDuplicate) continue;

        const oldestHours = Math.round(
            (now.getTime() - new Date(orders[0].createdAt).getTime()) / 3600 * 1000
        ) / 1000;

        await prisma.notification.create({
            data: {
                companyId,
                type: 'stale_preparing_orders',
                title: `⏰ ${orders.length} أوردر متأخر في التجهيز`,
                message: `أوردرات مفتوحة من أكثر من ${STALE_AFTER_HOURS} ساعة بدون شحن — أقدمها عمره ${Math.round(oldestHours)} ساعة. الأسرع مراجعتها قبل ما العميل يسأل: ${orders.slice(0, SAMPLE_SIZE).map((o) => o.orderNumber).join('، ')}`,
                data: {
                    count: orders.length,
                    sampleOrderNumber: dedupeKeySample,
                    orderNumbers: orders.slice(0, SAMPLE_SIZE).map((o) => o.orderNumber),
                    oldestOrderCreatedAt: orders[0].createdAt
                }
            }
        });
        companiesNotified += 1;
    }

    return { companiesNotified, staleOrders: staleOrders.length };
};

const startStaleOrderAlertLoop = () => {
    // first run after 2 minutes, then every 30 minutes
    setTimeout(() => {
        scanStaleOrders().catch((err) =>
            console.warn(`⏰ [STALE-ORDERS] scan failed: ${err.message}`)
        );
        setInterval(() => {
            scanStaleOrders().catch((err) =>
                console.warn(`⏰ [STALE-ORDERS] scan failed: ${err.message}`)
            );
        }, SCAN_INTERVAL_MS);
        console.log('⏰ [STALE-ORDERS] Stale order alert loop started (every 30 min).');
    }, 2 * 60 * 1000);
};

module.exports = {
    ACTIVE_STATUSES,
    STALE_AFTER_HOURS,
    selectStaleByCompany,
    scanStaleOrders,
    startStaleOrderAlertLoop
};
