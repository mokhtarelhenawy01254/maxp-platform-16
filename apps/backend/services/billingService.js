/**
 * BillingService — Standardized Billing Facade (V1.0)
 * Single entry point for all billing operations.
 */

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

class BillingService {
    /**
     * Create a PlatformSubscription for a new company on registration.
     * Called automatically after company creation.
     */
    async createSubscription(companyId) {
        const prisma = getSharedPrismaClient();
        // ponytail: platform-level trial removed — app-level trials (CompanyApp) handle it
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        try {
            const subscription = await executeWithRetry(async () => {
                return await prisma.platformSubscription.upsert({
                    where: { companyId },
                    update: { status: 'ACTIVE', nextBillingDate },
                    create: {
                        companyId,
                        status: 'ACTIVE',
                        billingDay: new Date().getDate(),
                        nextBillingDate,
                        monthlyFee: 0,
                    }
                });
            });

            await this.recordBillingEvent(companyId, 'PLATFORM_FEE', 0, 'SUCCESS', 'Subscription created');

            console.log(`✅ [BILLING] Subscription created for company ${companyId}`);
            return subscription;
        } catch (error) {
            console.error(`❌ [BILLING] Failed to create subscription for ${companyId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get the current subscription status for a company.
     */
    async getSubscriptionStatus(companyId) {
        const prisma = getSharedPrismaClient();
        try {
            const subscription = await prisma.platformSubscription.findUnique({
                where: { companyId }
            });

            if (!subscription) {
                return { active: false, status: 'NOT_FOUND' };
            }

            const now = new Date();
            const trialRemainingDays = subscription.trialEndDate
                ? Math.max(0, Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

            return {
                active: subscription.status === 'ACTIVE',
                status: subscription.status,
                nextBillingDate: subscription.nextBillingDate,
                trialEndDate: subscription.trialEndDate,
                trialRemainingDays,
                failedAttempts: subscription.failedAttempts,
            };
        } catch (error) {
            console.error(`❌ [BILLING] getSubscriptionStatus error for ${companyId}:`, error.message);
            return { active: false, status: 'ERROR' };
        }
    }

    /**
     * Suspend a company's subscription (e.g. after failed payment).
     */
    async suspendSubscription(companyId, reason = 'payment_failed') {
        const prisma = getSharedPrismaClient();
        try {
            await executeWithRetry(async () => {
                await prisma.platformSubscription.update({
                    where: { companyId },
                    data: { status: 'SUSPENDED' }
                });
            });

            await this.recordBillingEvent(companyId, 'PLATFORM_FEE', 0, 'FAILED',
                `Subscription suspended: ${reason}`);

            console.log(`⚠️ [BILLING] Subscription suspended for ${companyId}: ${reason}`);
        } catch (error) {
            console.error(`❌ [BILLING] suspendSubscription error for ${companyId}:`, error.message);
            throw error;
        }
    }

    /**
     * Reactivate a suspended subscription.
     */
    async reactivateSubscription(companyId) {
        const prisma = getSharedPrismaClient();
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        try {
            await executeWithRetry(async () => {
                await prisma.platformSubscription.update({
                    where: { companyId },
                    data: {
                        status: 'ACTIVE',
                        failedAttempts: 0,
                        nextBillingDate
                    }
                });
            });

            await this.recordBillingEvent(companyId, 'PLATFORM_FEE', 0, 'SUCCESS',
                'Subscription reactivated');

            console.log(`✅ [BILLING] Subscription reactivated for ${companyId}`);
        } catch (error) {
            console.error(`❌ [BILLING] reactivateSubscription error for ${companyId}:`, error.message);
            throw error;
        }
    }

// ponytail: upgradePlan removed — pricing now per-app/bundle, not plan tiers

// ponytail: getPlanLimits removed — limits now come from installed apps, not plan tiers

    /**
     * Get billing history for a company (paginated).
     */
    async getBillingHistory(companyId, page = 1, limit = 20) {
        const prisma = getSharedPrismaClient();
        try {
            const [history, total] = await Promise.all([
                prisma.billingHistory.findMany({
                    where: { companyId },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.billingHistory.count({ where: { companyId } })
            ]);

            return { history, total, page, pages: Math.ceil(total / limit) };
        } catch (error) {
            console.error(`❌ [BILLING] getBillingHistory error for ${companyId}:`, error.message);
            return { history: [], total: 0, page: 1, pages: 0 };
        }
    }

    /**
     * Record a billing event in BillingHistory.
     */
    async recordBillingEvent(companyId, type, amount, status, description = '') {
        const prisma = getSharedPrismaClient();
        try {
            await prisma.billingHistory.create({
                data: { companyId, type, amount, status, description }
            });
        } catch (error) {
            // Non-fatal — don't throw, just log
            console.warn(`⚠️ [BILLING] Failed to record billing event for ${companyId}:`, error.message);
        }
    }
}

module.exports = new BillingService();
