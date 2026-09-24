// Use shared database connection
const { getSharedPrismaClient } = require('./sharedDatabase');
const { getPhoneVariants, toCanonicalE164 } = require('../utils/phoneNormalization');

/**
 * Terminal order statuses used to calculate delivery rate and customer quality tier.
 * Only completed/delivered or returned/failed orders are evaluated.
 * In-flight orders (PENDING, CONFIRMED, PREPARING, SHIPPED, OUT_FOR_DELIVERY) are excluded
 * so they don't penalize the customer while delivery is in progress.
 */
const DELIVERED_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED'];
const RETURNED_FAILED_STATUSES = ['RETURNED', 'PARTIALLY_RETURNED', 'LOST', 'REFUNDED'];

/**
 * Calculates customer delivery statistics and rating tier based on past orders.
 * 
 * Rating levels:
 * - EXCELLENT: (totalAttempts >= 3 && deliveryRate >= 85%) OR (totalAttempts === 2 && totalDelivered === 2)
 * - GOOD: (totalDelivered >= 1 && deliveryRate >= 50%)
 * - POOR: (deliveryRate < 50% or 0 delivered with failed attempts)
 * - UNKNOWN: 0 completed orders (new customer or only in-flight orders)
 * 
 * @param {string} customerId
 * @param {string} companyId
 * @param {object} [prismaClient]
 * @returns {Promise<{ deliveryRate: number, totalDelivered: number, totalFailed: number, totalAttempts: number, rating: string }>}
 */
const calculateCustomerScore = async (customerId, companyId, prismaClient = null) => {
    try {
        const prisma = prismaClient || getSharedPrismaClient();

        if (!customerId || !companyId) {
            return null;
        }

        // 1. Fetch customer details (including phone for cross-matching guest/linked orders)
        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId },
            select: { id: true, companyId: true, phone: true, phoneNormalized: true }
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

        // 2. Fetch all orders for this customer in terminal states
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
                }
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
                    select: { status: true, oldStatus: true, reason: true },
                    take: 10
                }
            }
        });

        // 3. Evaluate each order: Delivered vs Failed vs Excluded Pre-Shipment Cancellation
        let deliveredCount = 0;
        let failedCount = 0;

        for (const order of orders) {
            const hasReviewedCustomerFault = order.returnRequests.some(
                r => r.responsibleParty === 'CUSTOMER' && r.status === 'APPROVED'
            );

            // Is Delivered?
            if (DELIVERED_STATUSES.includes(order.status)) {
                if (hasReviewedCustomerFault) {
                    failedCount++;
                } else {
                    deliveredCount++;
                }
                continue;
            }

            // Is explicit Returned or Lost?
            if (RETURNED_FAILED_STATUSES.includes(order.status)) {
                failedCount++;
                continue;
            }

            // Is CANCELLED?
            if (order.status === 'CANCELLED') {
                // If it has customer-fault return record or explicit courier return reason, count as failed
                if (hasReviewedCustomerFault || order.turboReturnReason) {
                    failedCount++;
                    continue;
                }

                // Check if the order was cancelled AFTER reaching advanced stage (shipped/preparing/out for delivery)
                const historyStatuses = (order.statusHistory || []).map(h => String(h.status || '').toUpperCase());
                const wasShippedOrDispatched = historyStatuses.some(s => 
                    ['SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP'].includes(s)
                );

                if (wasShippedOrDispatched) {
                    // Refused at door or cancelled while out for delivery
                    failedCount++;
                }
                // Pre-dispatch draft/pending cancellation is not counted against customer delivery reliability
            }
        }

        // 4. Calculate Delivery Rate
        const totalAttempts = deliveredCount + failedCount;
        let deliveryRate = 0;
        if (totalAttempts > 0) {
            deliveryRate = Math.round((deliveredCount / totalAttempts) * 1000) / 10; // 1 decimal place, e.g. 85.5%
        }

        // 5. Determine Rating Tier dynamically based on Company Order Settings
        // (إعدادات الطلبات -> تقييم العملاء: ممتاز، جيد، متوسط، ضعيف)
        let excellentThreshold = 85;
        let goodThreshold = 70;
        let averageThreshold = 50;
        let minOrdersForRating = 3;

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
                }
            }
        } catch (settingsErr) {
            // fallback gracefully to standard thresholds
        }

        let rating = 'UNKNOWN';
        if (totalAttempts > 0) {
            if (totalAttempts >= minOrdersForRating) {
                if (deliveryRate >= excellentThreshold) {
                    rating = 'EXCELLENT';
                } else if (deliveryRate >= goodThreshold) {
                    rating = 'GOOD';
                } else if (deliveryRate >= averageThreshold) {
                    rating = 'AVERAGE';
                } else {
                    rating = 'POOR';
                }
            } else {
                // If customer has fewer than minOrdersForRating (e.g. 1 or 2 orders):
                if (deliveredCount === totalAttempts && deliveryRate >= (goodThreshold || 50)) {
                    rating = (totalAttempts >= 2 && deliveryRate >= excellentThreshold) ? 'EXCELLENT' : 'GOOD';
                } else if (deliveredCount > 0 && deliveryRate >= (averageThreshold || 50)) {
                    rating = 'GOOD';
                } else {
                    rating = 'POOR';
                }
            }
        }

        // 6. Update Customer record in database
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                deliveryRate: deliveryRate,
                totalDelivered: deliveredCount,
                totalOrdersCount: totalAttempts,
                customerRating: rating,
                successScore: deliveryRate
            },
            select: {
                id: true,
                deliveryRate: true,
                totalDelivered: true,
                totalOrdersCount: true,
                customerRating: true,
                successScore: true
            }
        });

        return {
            customerId: customer.id,
            deliveryRate,
            totalDelivered: deliveredCount,
            totalFailed: failedCount,
            totalAttempts,
            rating
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
 */
const recalculateCustomerRating = async (customerId, companyId) => {
    if (!customerId || !companyId) return null;
    try {
        return await calculateCustomerScore(customerId, companyId);
    } catch (err) {
        console.warn(`⚠️ [CUSTOMER-RATING-SAFE] Failed to recalculate customer rating for ${customerId}:`, err.message);
        return null;
    }
};

/**
 * Batch recalculate ratings for all customers belonging to a company.
 * Useful for initial backfill or maintenance sync.
 * 
 * @param {string} companyId 
 * @param {number} [batchSize=50]
 * @returns {Promise<{ total: number, processed: number, successCount: number, errorCount: number }>}
 */
const batchRecalculateCompanyCustomers = async (companyId, batchSize = 50) => {
    const prisma = getSharedPrismaClient();
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    const total = await prisma.customer.count({
        where: { companyId }
    });

    let skip = 0;
    while (skip < total) {
        const batch = await prisma.customer.findMany({
            where: { companyId },
            select: { id: true },
            skip,
            take: batchSize,
            orderBy: { id: 'asc' }
        });

        if (!batch.length) break;

        for (const cust of batch) {
            try {
                await calculateCustomerScore(cust.id, companyId, prisma);
                successCount++;
            } catch (err) {
                errorCount++;
            }
            processed++;
        }

        skip += batchSize;
    }

    return { total, processed, successCount, errorCount };
};

module.exports = {
    calculateCustomerScore,
    recalculateCustomerRating,
    batchRecalculateCompanyCustomers
};
