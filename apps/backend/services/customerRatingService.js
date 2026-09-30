// Use shared database connection
const { getSharedPrismaClient } = require('./sharedDatabase');
const { getPhoneVariants, toCanonicalE164 } = require('../utils/phoneNormalization');

/**
 * Global rules version for customer rating classification engine.
 */
const CURRENT_RULES_VERSION = '2026.09.30.v2';

/**
 * Terminal order statuses used to calculate delivery rate and customer quality tier.
 * Only completed/delivered or returned/failed orders are evaluated.
 * In-flight orders (PENDING, CONFIRMED, PREPARING, SHIPPED, OUT_FOR_DELIVERY) are excluded
 * so they don't penalize the customer while delivery is in progress.
 */
const DELIVERED_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED'];
const RETURNED_FAILED_STATUSES = ['RETURNED', 'PARTIALLY_RETURNED', 'LOST', 'REFUNDED', 'CANCELLED'];

/**
 * In-memory concurrency lock per customer to prevent race conditions and non-deterministic writes.
 * @type {Map<string, Promise<void>>}
 */
const customerLocks = new Map();

/**
 * Executes an async task with an exclusive lock per customerId.
 * Concurrent requests for the same customer wait and execute serially.
 * 
 * @param {string} customerId 
 * @param {() => Promise<any>} task 
 * @returns {Promise<any>}
 */
async function withCustomerLock(customerId, task) {
    if (!customerId) return await task();

    const previousLock = customerLocks.get(customerId) || Promise.resolve();
    let release;
    const nextLock = new Promise(resolve => {
        release = resolve;
    });

    customerLocks.set(customerId, nextLock);

    try {
        await previousLock;
        return await task();
    } finally {
        release();
        if (customerLocks.get(customerId) === nextLock) {
            customerLocks.delete(customerId);
        }
    }
}

/**
 * Validates store rating settings thresholds and bounds.
 * Enforces:
 * - Numbers are non-negative and <= 100%
 * - Strictly monotonic ordering: average < good < excellent
 * - minOrdersForRating >= 1
 * - Tier minimum order counts are properly ordered: minOrdersForRating <= minOrdersAverage <= minOrdersGood <= minOrdersExcellent
 * 
 * @param {object} settings 
 * @returns {{ valid: boolean, message?: string }}
 */
function validateRatingSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return { valid: false, message: 'بيانات إعدادات التقييم غير صالحة' };
    }

    const excellent = Number(settings.excellentThreshold);
    const good = Number(settings.goodThreshold);
    const average = Number(settings.averageThreshold);
    const minOrders = Number(settings.minOrdersForRating);

    if (isNaN(excellent) || isNaN(good) || isNaN(average) || isNaN(minOrders)) {
        return { valid: false, message: 'قيم نسب التقييم والحد الأدنى للطلبات يجب أن تكون أرقاماً صحيحة أو عشرية صالحة' };
    }

    if (average < 0 || average > 100 || good < 0 || good > 100 || excellent < 0 || excellent > 100) {
        return { valid: false, message: 'نسب التقييم المئوية يجب أن تكون محصورة بين 0% و 100%' };
    }

    if (average >= good) {
        return { valid: false, message: 'نسبة التقييم المتوسط يجب أن تكون أقل تماماً من نسبة التقييم الجيد (متوسط < جيد)' };
    }

    if (good >= excellent) {
        return { valid: false, message: 'نسبة التقييم الجيد يجب أن تكون أقل تماماً من نسبة التقييم الممتاز (جيد < ممتاز)' };
    }

    if (minOrders < 1) {
        return { valid: false, message: 'الحد الأدنى لعدد الطلبات لبدء التصنيف يجب أن يكون 1 على الأقل' };
    }

    const minAvg = Number(settings.minOrdersAverage ?? minOrders);
    const minGood = Number(settings.minOrdersGood ?? 5);
    const minExc = Number(settings.minOrdersExcellent ?? 10);

    if (minAvg < minOrders) {
        return { valid: false, message: 'الحد الأدنى لطلبات المستوى المتوسط يجب أن لا يقل عن الحد الأدنى للتقييم' };
    }

    if (minGood < minAvg || minExc < minGood) {
        return { valid: false, message: 'الحد الأدنى لعدد طلبات المستويات يجب أن يتسلسل تصاعدياً (متوسط ≤ جيد ≤ ممتاز)' };
    }

    return { valid: true };
}

/**
 * Calculates customer delivery statistics and rating tier based on past orders.
 * 
 * Rating levels (4 tiers + UNKNOWN):
 * - EXCELLENT: totalAttempts >= 10 AND deliveryRate >= 90% (both required)
 * - GOOD:      totalAttempts >= 5  AND deliveryRate >= 75% (both required)
 * - AVERAGE:   totalAttempts >= 3  AND deliveryRate >= 50% (both required)
 * - POOR:      totalAttempts >= minOrders (>= 3) but does not qualify for AVERAGE
 * - UNKNOWN:   totalAttempts < minOrders (< 3 attempts)
 * 
 * Rules:
 * - PARTIALLY_DELIVERED / PARTIALLY_RETURNED are weighted proportionally (0.5 delivered, 0.5 failed).
 * - LOST / REFUNDED are NOT penalized against the customer unless explicit customer fault is confirmed.
 * - Deterministic: statusHistory is sorted by createdAt asc without random limits.
 * - Supports reference timestamp (asOf) for reproducible calculations.
 * 
 * @param {string} customerId
 * @param {string} companyId
 * @param {object} [prismaClient]
 * @param {object} [options]
 * @param {Date|string} [options.asOf]
 * @param {boolean} [options.bypassLock]
 * @returns {Promise<{
 *   customerId: string,
 *   deliveryRate: number,
 *   totalDelivered: number,
 *   totalFailed: number,
 *   totalAttempts: number,
 *   totalOrdersCount: number,
 *   rating: string,
 *   rulesVersion: string,
 *   ratingVersion: number,
 *   lastCalculatedAt: string,
 *   asOf: string
 * }>}
 */
const calculateCustomerScore = async (customerId, companyId, prismaClient = null, options = {}) => {
    if (!customerId || !companyId) {
        return null;
    }

    if (!options.bypassLock) {
        return withCustomerLock(customerId, () => 
            calculateCustomerScore(customerId, companyId, prismaClient, { ...options, bypassLock: true })
        );
    }

    try {
        const prisma = prismaClient || getSharedPrismaClient();
        const asOfDate = options.asOf ? new Date(options.asOf) : null;
        const asOfIso = (asOfDate || new Date()).toISOString();

        // 1. Fetch customer details
        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId },
            select: { id: true, companyId: true, phone: true, phoneNormalized: true, metadata: true }
        });

        if (!customer) {
            return null;
        }

        // Build order query criteria (by customerId OR matching customer's verified phone variants)
        const orderWhereConditions = [{ customerId: customer.id, companyId }];
        const normalizedPhone = customer.phoneNormalized || toCanonicalE164(customer.phone);
        if (normalizedPhone) {
            const variants = getPhoneVariants(normalizedPhone);
            if (variants && variants.length > 0) {
                orderWhereConditions.push({
                    companyId,
                    customerPhone: { in: variants }
                });
            }
        }

        const createdAtFilter = asOfDate ? { createdAt: { lte: asOfDate } } : {};

        // 2. Fetch all orders for this customer in terminal states (deterministic sort)
        const orders = await prisma.order.findMany({
            where: {
                companyId,
                OR: orderWhereConditions,
                status: {
                    in: [
                        'DELIVERED',
                        'PARTIALLY_DELIVERED',
                        'RETURNED',
                        'PARTIALLY_RETURNED',
                        'REFUNDED',
                        'LOST',
                        'CANCELLED'
                    ]
                },
                ...createdAtFilter
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                notes: true,
                turboReturnReason: true,
                turboShipmentStatus: true,
                createdAt: true,
                returnRequests: {
                    where: { isReviewed: true },
                    select: { id: true, status: true, responsibleParty: true }
                },
                statusHistory: {
                    select: { status: true, oldStatus: true, reason: true, createdAt: true },
                    orderBy: { createdAt: 'asc' } // DETERMINISTIC
                }
            },
            orderBy: { createdAt: 'asc' } // DETERMINISTIC
        });

        // Optional guest orders fallback if guestOrder table is populated
        let guestOrders = [];
        if (prisma.guestOrder && normalizedPhone) {
            try {
                const variants = getPhoneVariants(normalizedPhone) || [];
                if (variants.length > 0) {
                    guestOrders = await prisma.guestOrder.findMany({
                        where: {
                            companyId,
                            guestPhone: { in: variants },
                            status: {
                                in: [
                                    'DELIVERED',
                                    'PARTIALLY_DELIVERED',
                                    'RETURNED',
                                    'PARTIALLY_RETURNED',
                                    'REFUNDED',
                                    'LOST',
                                    'CANCELLED',
                                    'delivered',
                                    'returned',
                                    'cancelled'
                                ]
                            },
                            ...createdAtFilter
                        },
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'asc' }
                    });
                }
            } catch (guestErr) {
                // Ignore guestOrder table errors if schema difference
            }
        }

        // Deduplicate between order and guestOrder by orderNumber
        const existingOrderNumbers = new Set(orders.map(o => String(o.orderNumber || '').toUpperCase()));
        const uniqueGuestOrders = guestOrders.filter(g => !existingOrderNumbers.has(String(g.orderNumber || '').toUpperCase()));

        // 3. Evaluate each order: Weighted Delivered vs Failed vs Neutral/Excluded
        let deliveredWeight = 0;
        let failedWeight = 0;

        for (const order of orders) {
            const hasReviewedCustomerFault = (order.returnRequests || []).some(
                r => r.responsibleParty === 'CUSTOMER' && r.status === 'APPROVED'
            );
            const hasReviewedNonCustomerFault = (order.returnRequests || []).some(
                r => r.responsibleParty && r.responsibleParty !== 'CUSTOMER' && r.status === 'APPROVED'
            );

            // Case A: Full Delivery
            if (order.status === 'DELIVERED') {
                if (hasReviewedCustomerFault) {
                    failedWeight += 1.0;
                } else {
                    deliveredWeight += 1.0;
                }
                continue;
            }

            // Case B: Partial Delivery (Weighted 0.5 delivered / 0.5 failed)
            if (order.status === 'PARTIALLY_DELIVERED') {
                if (hasReviewedCustomerFault) {
                    failedWeight += 1.0;
                } else {
                    deliveredWeight += 0.5;
                    failedWeight += 0.5;
                }
                continue;
            }

            // Case C: Partial Return (Weighted 0.5 delivered / 0.5 failed unless non-customer fault)
            if (order.status === 'PARTIALLY_RETURNED') {
                if (hasReviewedNonCustomerFault) {
                    deliveredWeight += 0.5;
                } else {
                    deliveredWeight += 0.5;
                    failedWeight += 0.5;
                }
                continue;
            }

            // Case D: LOST (Courier fault - neutral, NOT customer failure)
            if (order.status === 'LOST') {
                if (hasReviewedCustomerFault) {
                    failedWeight += 1.0;
                }
                // Default: Do NOT penalize customer for lost shipment
                continue;
            }

            // Case E: REFUNDED (Merchant/defective refund - neutral, NOT customer failure)
            if (order.status === 'REFUNDED') {
                if (hasReviewedCustomerFault) {
                    failedWeight += 1.0;
                }
                // Default: Do NOT penalize customer for refund
                continue;
            }

            // Case F: Full RETURNED
            if (order.status === 'RETURNED') {
                if (hasReviewedNonCustomerFault) {
                    // Carrier or Store error acknowledged in review -> do not penalize
                    continue;
                }
                failedWeight += 1.0;
                continue;
            }

            // Case G: CANCELLED
            if (order.status === 'CANCELLED') {
                if (hasReviewedCustomerFault) {
                    failedWeight += 1.0;
                    continue;
                }

                // Check if cancelled after dispatch / out for delivery
                const historyStatuses = (order.statusHistory || []).map(h => String(h.status || '').toUpperCase());
                const wasShippedOrDispatched = historyStatuses.some(s => 
                    ['SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP'].includes(s)
                );

                if (wasShippedOrDispatched) {
                    if (!hasReviewedNonCustomerFault) {
                        failedWeight += 1.0;
                    }
                }
                // Pre-dispatch draft/pending cancellation is neutral
            }
        }

        // Process guest orders
        for (const guest of uniqueGuestOrders) {
            const st = String(guest.status || '').toUpperCase();
            if (st === 'DELIVERED') {
                deliveredWeight += 1.0;
            } else if (st === 'PARTIALLY_DELIVERED' || st === 'PARTIALLY_RETURNED') {
                deliveredWeight += 0.5;
                failedWeight += 0.5;
            } else if (st === 'RETURNED') {
                failedWeight += 1.0;
            }
            // LOST / REFUNDED / CANCELLED on guest orders are not penalized by default
        }

        // 4. Calculate Delivery Rate
        const totalAttempts = deliveredWeight + failedWeight;
        let deliveryRate = 0;
        if (totalAttempts > 0) {
            deliveryRate = Math.round((deliveredWeight / totalAttempts) * 1000) / 10; // 1 decimal place, e.g. 85.5%
        }

        // 5. Determine Rating Tier dynamically based on Company Order Settings
        let excellentThreshold = 90;
        let goodThreshold = 75;
        let averageThreshold = 50;
        let minOrdersForRating = 3;
        let minOrdersExcellent = 10;
        let minOrdersGood = 5;
        let minOrdersAverage = 3;

        try {
            if (prisma.returnSettings) {
                const settings = await prisma.returnSettings.findUnique({
                    where: { companyId },
                    select: {
                        excellentThreshold: true,
                        goodThreshold: true,
                        minOrdersForRating: true,
                        reviewDisplayConfig: true
                    }
                });
                if (settings) {
                    if (typeof settings.excellentThreshold === 'number') {
                        excellentThreshold = settings.excellentThreshold;
                    }
                    if (typeof settings.goodThreshold === 'number') {
                        goodThreshold = settings.goodThreshold;
                    }
                    if (typeof settings.minOrdersForRating === 'number') {
                        minOrdersForRating = settings.minOrdersForRating;
                    }

                    const reviewCfg = typeof settings.reviewDisplayConfig === 'string'
                        ? JSON.parse(settings.reviewDisplayConfig || '{}')
                        : (settings.reviewDisplayConfig || {});

                    if (reviewCfg && typeof reviewCfg.averageThreshold === 'number') {
                        averageThreshold = reviewCfg.averageThreshold;
                    }
                    if (reviewCfg && typeof reviewCfg.minOrdersExcellent === 'number') {
                        minOrdersExcellent = reviewCfg.minOrdersExcellent;
                    }
                    if (reviewCfg && typeof reviewCfg.minOrdersGood === 'number') {
                        minOrdersGood = reviewCfg.minOrdersGood;
                    }
                    if (reviewCfg && typeof reviewCfg.minOrdersAverage === 'number') {
                        minOrdersAverage = reviewCfg.minOrdersAverage;
                    }
                }
            }
        } catch (settingsErr) {
            // fallback gracefully to standard thresholds
        }

        // 6. Classification Engine (Both Count AND Delivery Rate are strictly required)
        let rating = 'UNKNOWN';
        if (totalAttempts < minOrdersForRating) {
            rating = 'UNKNOWN';
        } else {
            if (totalAttempts >= minOrdersExcellent && deliveryRate >= excellentThreshold) {
                rating = 'EXCELLENT';
            } else if (totalAttempts >= minOrdersGood && deliveryRate >= goodThreshold) {
                rating = 'GOOD';
            } else if (totalAttempts >= minOrdersAverage && deliveryRate >= averageThreshold) {
                rating = 'AVERAGE';
            } else {
                rating = 'POOR';
            }
        }

        // 7. Update Customer record in database with metadata tracking
        let existingMetadata = {};
        try {
            existingMetadata = typeof customer.metadata === 'string'
                ? JSON.parse(customer.metadata || '{}')
                : (customer.metadata || {});
        } catch (e) {
            existingMetadata = {};
        }

        const currentRatingVersion = (existingMetadata.ratingMetadata?.ratingVersion || 0) + 1;
        const nowIso = new Date().toISOString();

        const updatedRatingMetadata = {
            ratingVersion: currentRatingVersion,
            rulesVersion: CURRENT_RULES_VERSION,
            lastCalculatedAt: nowIso,
            lastCalculatedAsOf: asOfIso,
            ratingDirty: false
        };

        const updatedMetadataStr = JSON.stringify({
            ...existingMetadata,
            ratingMetadata: updatedRatingMetadata
        });

        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                deliveryRate: deliveryRate,
                totalDelivered: Math.floor(deliveredWeight),
                totalOrdersCount: Math.round(totalAttempts),
                customerRating: rating,
                successScore: deliveryRate,
                metadata: updatedMetadataStr
            }
        });

        return {
            customerId: customer.id,
            deliveryRate,
            totalDelivered: deliveredWeight,
            totalFailed: failedWeight,
            totalAttempts,
            totalOrdersCount: Math.round(totalAttempts),
            rating,
            rulesVersion: CURRENT_RULES_VERSION,
            ratingVersion: currentRatingVersion,
            lastCalculatedAt: nowIso,
            asOf: asOfIso
        };

    } catch (error) {
        console.error(`[CUSTOMER-RATING] Error calculating score for customer ${customerId}:`, error.message);
        throw error;
    }
};

/**
 * Safe background wrapper that does not throw errors, suitable for fire-and-forget hooks.
 * 
 * @param {string} customerId 
 * @param {string} companyId 
 * @param {object} [options]
 */
const recalculateCustomerRating = async (customerId, companyId, options = {}) => {
    if (!customerId || !companyId) return null;
    try {
        return await calculateCustomerScore(customerId, companyId, null, options);
    } catch (err) {
        console.warn(`⚠️ [CUSTOMER-RATING-SAFE] Failed to recalculate customer rating for ${customerId}:`, err.message);
        return null;
    }
};

// Tracking recent health metadata in-memory for live telemetry
const companyHealthState = new Map();

/**
 * Batch recalculate ratings for all customers belonging to a company.
 * Uses CURSOR-BASED pagination (not offset skip) to eliminate skipping records when new rows are added.
 * 
 * @param {string} companyId 
 * @param {number} [batchSize=50]
 * @param {object} [options]
 * @returns {Promise<{
 *   companyId: string,
 *   total: number,
 *   processed: number,
 *   successCount: number,
 *   errorCount: number,
 *   durationMs: number,
 *   timestamp: string
 * }>}
 */
const batchRecalculateCompanyCustomers = async (companyId, batchSize = 50, prismaClient = null, options = {}) => {
    const prisma = prismaClient || getSharedPrismaClient();
    const startTime = Date.now();
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    let cursor = null;

    const total = await prisma.customer.count({
        where: { companyId }
    });

    while (true) {
        const findOptions = {
            where: { companyId },
            select: { id: true },
            take: batchSize,
            orderBy: { id: 'asc' }
        };

        if (cursor) {
            findOptions.skip = 1;
            findOptions.cursor = { id: cursor };
        }

        const batch = await prisma.customer.findMany(findOptions);
        if (!batch || batch.length === 0) break;

        for (const cust of batch) {
            try {
                await calculateCustomerScore(cust.id, companyId, prisma, options);
                successCount++;
            } catch (err) {
                errorCount++;
            }
            processed++;
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < batchSize) break;
    }

    const durationMs = Date.now() - startTime;
    const result = {
        companyId,
        total,
        processed,
        successCount,
        errorCount,
        durationMs,
        timestamp: new Date().toISOString()
    };

    companyHealthState.set(companyId, {
        lastRunAt: result.timestamp,
        lastDurationMs: durationMs,
        lastErrorCount: errorCount,
        lastSuccessCount: successCount
    });

    return result;
};

/**
 * Returns comprehensive health report and breakdown of customer ratings for a company.
 * 
 * @param {string} companyId 
 * @param {object} [prismaClient]
 * @returns {Promise<{
 *   companyId: string,
 *   totalCustomers: number,
 *   ratedCustomers: number,
 *   unratedCustomers: number,
 *   breakdown: { EXCELLENT: number, GOOD: number, AVERAGE: number, POOR: number, UNKNOWN: number },
 *   rulesVersion: string,
 *   lastRunAt: string,
 *   failureCount: number,
 *   activeThresholds: object
 * }>}
 */
const getCustomerRatingHealth = async (companyId, prismaClient = null) => {
    const prisma = prismaClient || getSharedPrismaClient();

    const totalCustomers = await prisma.customer.count({
        where: { companyId }
    });

    const ratingCounts = await prisma.customer.groupBy({
        by: ['customerRating'],
        where: { companyId },
        _count: { id: true }
    });

    const breakdown = {
        EXCELLENT: 0,
        GOOD: 0,
        AVERAGE: 0,
        POOR: 0,
        UNKNOWN: 0
    };

    for (const item of ratingCounts) {
        if (item.customerRating && breakdown[item.customerRating] !== undefined) {
            breakdown[item.customerRating] = item._count.id;
        }
    }

    const unratedCustomers = breakdown.UNKNOWN || 0;
    const ratedCustomers = totalCustomers - unratedCustomers;

    let thresholds = {
        excellentThreshold: 90,
        goodThreshold: 75,
        averageThreshold: 50,
        minOrdersForRating: 3
    };

    try {
        if (prisma.returnSettings) {
            const settings = await prisma.returnSettings.findUnique({
                where: { companyId },
                select: {
                    excellentThreshold: true,
                    goodThreshold: true,
                    minOrdersForRating: true,
                    reviewDisplayConfig: true
                }
            });
            if (settings) {
                if (typeof settings.excellentThreshold === 'number') thresholds.excellentThreshold = settings.excellentThreshold;
                if (typeof settings.goodThreshold === 'number') thresholds.goodThreshold = settings.goodThreshold;
                if (typeof settings.minOrdersForRating === 'number') thresholds.minOrdersForRating = settings.minOrdersForRating;
                const reviewCfg = typeof settings.reviewDisplayConfig === 'string'
                    ? JSON.parse(settings.reviewDisplayConfig || '{}')
                    : (settings.reviewDisplayConfig || {});
                if (reviewCfg && typeof reviewCfg.averageThreshold === 'number') {
                    thresholds.averageThreshold = reviewCfg.averageThreshold;
                }
            }
        }
    } catch (e) {
        // use defaults
    }

    const state = companyHealthState.get(companyId);

    return {
        companyId,
        totalCustomers,
        ratedCustomers,
        unratedCustomers,
        breakdown,
        rulesVersion: CURRENT_RULES_VERSION,
        lastRunAt: state?.lastRunAt || null,
        failureCount: state?.lastErrorCount || 0,
        activeThresholds: thresholds,
        status: (state?.lastErrorCount || 0) === 0 ? 'HEALTHY' : 'WARNING'
    };
};

/**
 * Marks a customer as dirty so the hourly reconciliation cron can re-evaluate them.
 * 
 * @param {string} customerId 
 * @param {string} companyId 
 * @param {object} [prismaClient]
 */
const markCustomerDirty = async (customerId, companyId, prismaClient = null) => {
    if (!customerId || !companyId) return;
    try {
        const prisma = prismaClient || getSharedPrismaClient();
        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId },
            select: { id: true, metadata: true }
        });
        if (!customer) return;

        let meta = {};
        try {
            meta = typeof customer.metadata === 'string' ? JSON.parse(customer.metadata || '{}') : (customer.metadata || {});
        } catch (e) {
            meta = {};
        }

        meta.ratingMetadata = {
            ...(meta.ratingMetadata || {}),
            ratingDirty: true,
            dirtyMarkedAt: new Date().toISOString()
        };

        await prisma.customer.update({
            where: { id: customer.id },
            data: { metadata: JSON.stringify(meta) }
        });
    } catch (err) {
        console.warn(`⚠️ [CUSTOMER-RATING] Failed to mark customer ${customerId} dirty:`, err.message);
    }
};

module.exports = {
    CURRENT_RULES_VERSION,
    calculateCustomerScore,
    recalculateCustomerRating,
    batchRecalculateCompanyCustomers,
    getCustomerRatingHealth,
    validateRatingSettings,
    markCustomerDirty,
    withCustomerLock
};
