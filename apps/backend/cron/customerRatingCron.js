/**
 * Customer Rating Automated Reconciliation Scheduler
 * 
 * 1. Hourly cron: Re-evaluates dirty / pending customers with per-customer lock.
 * 2. Daily cron: Full cursor-based backfill / health sync for all active companies.
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
    calculateCustomerScore,
    batchRecalculateCompanyCustomers
} = require('../services/customerRatingService');

let isHourlyRunning = false;
let isDailyRunning = false;

/**
 * Re-evaluates customers flagged as dirty or modified within the past hour.
 */
async function runHourlyCustomerRatingSync() {
    if (isHourlyRunning) {
        console.log('⏳ [CUSTOMER-RATING-CRON] Hourly job already running, skipping.');
        return;
    }
    isHourlyRunning = true;

    try {
        const prisma = getSharedPrismaClient();

        // 1. Find customers explicitly flagged with ratingDirty in metadata
        const dirtyCustomers = await prisma.customer.findMany({
            where: {
                metadata: {
                    contains: '"ratingDirty":true'
                }
            },
            select: { id: true, companyId: true },
            take: 200
        });

        if (dirtyCustomers.length > 0) {
            console.log(`🔄 [CUSTOMER-RATING-CRON] Processing ${dirtyCustomers.length} dirty customer(s)...`);
            for (const cust of dirtyCustomers) {
                try {
                    await calculateCustomerScore(cust.id, cust.companyId, prisma);
                } catch (err) {
                    console.warn(`⚠️ [CUSTOMER-RATING-CRON] Failed for customer ${cust.id}:`, err.message);
                }
            }
        }

        // 2. Backfill: Find customers who have never been rated (UNKNOWN with 0 totalOrdersCount) but have terminal orders
        const unratedWithOrders = await prisma.customer.findMany({
            where: {
                customerRating: 'UNKNOWN',
                totalOrdersCount: 0,
                orders: {
                    some: {
                        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'PARTIALLY_RETURNED'] }
                    }
                }
            },
            select: { id: true, companyId: true },
            take: 50
        });

        if (unratedWithOrders.length > 0) {
            console.log(`🔄 [CUSTOMER-RATING-CRON] Backfilling ${unratedWithOrders.length} unrated customer(s) with completed orders...`);
            for (const cust of unratedWithOrders) {
                try {
                    await calculateCustomerScore(cust.id, cust.companyId, prisma);
                } catch (err) {
                    console.warn(`⚠️ [CUSTOMER-RATING-CRON] Backfill failed for customer ${cust.id}:`, err.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ [CUSTOMER-RATING-CRON] Error in hourly customer rating sync:', error.message);
    } finally {
        isHourlyRunning = false;
    }
}

/**
 * Full daily reconciliation across all active companies using cursor pagination.
 */
async function runDailyCompanyCustomerRatingSync() {
    if (isDailyRunning) {
        console.log('⏳ [CUSTOMER-RATING-CRON] Daily job already running, skipping.');
        return;
    }
    isDailyRunning = true;

    try {
        const prisma = getSharedPrismaClient();
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });

        console.log(`🌅 [CUSTOMER-RATING-CRON] Starting daily customer rating sync for ${companies.length} company(ies)...`);

        for (const company of companies) {
            try {
                const result = await batchRecalculateCompanyCustomers(company.id, 50, prisma);
                console.log(`✅ [CUSTOMER-RATING-CRON] Company ${company.name} (${company.id}) synced: ${result.successCount} success / ${result.errorCount} error.`);
            } catch (companyErr) {
                console.error(`❌ [CUSTOMER-RATING-CRON] Failed daily sync for company ${company.id}:`, companyErr.message);
            }
        }

    } catch (error) {
        console.error('❌ [CUSTOMER-RATING-CRON] Error in daily company customer rating sync:', error.message);
    } finally {
        isDailyRunning = false;
    }
}

/**
 * Initializes cron jobs for automated customer rating management.
 */
function startCustomerRatingScheduler() {
    // Run hourly at minute 0
    cron.schedule('0 * * * *', () => {
        runHourlyCustomerRatingSync();
    });

    // Run daily at 03:00 AM
    cron.schedule('0 3 * * *', () => {
        runDailyCompanyCustomerRatingSync();
    });

    console.log('🕒 [CUSTOMER-RATING-CRON] Customer rating automated schedulers initialized (hourly dirty sync + daily company sync).');
}

module.exports = {
    startCustomerRatingScheduler,
    runHourlyCustomerRatingSync,
    runDailyCompanyCustomerRatingSync
};
