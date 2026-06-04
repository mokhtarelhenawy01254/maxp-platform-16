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
    async createSubscription(companyId, plan = 'BASIC', trialDays = 0) {
        const prisma = getSharedPrismaClient();
        const planFees = { BASIC: 0, PRO: 299, ENTERPRISE: 999 };
        const monthlyFee = planFees[plan] ?? 0;

        const nextBillingDate = new Date();
        const daysToAdd = trialDays > 0 ? trialDays : 30;
        nextBillingDate.setDate(nextBillingDate.getDate() + daysToAdd);

        const trialEndDate = trialDays > 0
            ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
            : null;

        const status = trialDays > 0 ? 'TRIAL' : 'ACTIVE';

        try {
            const subscription = await executeWithRetry(async () => {
                return await prisma.platformSubscription.upsert({
                    where: { companyId },
                    update: { plan, monthlyFee, status, nextBillingDate, trialEndDate },
                    create: {
                        companyId,
                        plan,
                        monthlyFee,
                        status,
                        billingDay: new Date().getDate(),
                        nextBillingDate,
                        trialEndDate,
                    }
                });
            });

            await this.recordBillingEvent(companyId, 'PLATFORM_FEE', 0, 'SUCCESS',
                `Subscription created: ${plan} plan ${trialDays > 0 ? `(${trialDays} days trial)` : ''}`);

            WhatsAppNotificationService.sendSubscriptionCreatedNotification({
                companyId,
                planName: plan,
                monthlyFee,
                currency: 'EGP',
                billingCycle: 'monthly',
                nextBillingDate,
                trialDays
            }).catch((notificationError) => {
                console.error(`❌ [BILLING] Failed to send subscription created notification for ${companyId}:`, notificationError.message);
            });

            console.log(`✅ [BILLING] Subscription created for company ${companyId} (${plan}) - Status: ${status}`);
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
                return { active: false, plan: 'NONE', status: 'NOT_FOUND' };
            }

            const now = new Date();
            const trialRemainingDays = subscription.trialEndDate
                ? Math.max(0, Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;

            return {
                active: subscription.status === 'ACTIVE',
                plan: subscription.plan,
                status: subscription.status,
                nextBillingDate: subscription.nextBillingDate,
                trialEndDate: subscription.trialEndDate,
                trialRemainingDays,
                monthlyFee: subscription.monthlyFee,
                failedAttempts: subscription.failedAttempts,
            };
        } catch (error) {
            console.error(`❌ [BILLING] getSubscriptionStatus error for ${companyId}:`, error.message);
            return { active: false, plan: 'NONE', status: 'ERROR' };
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

    /**
     * Upgrade a company's plan.
     */
    async upgradePlan(companyId, newPlan) {
        const prisma = getSharedPrismaClient();
        const planFees = { BASIC: 0, PRO: 299, ENTERPRISE: 999 };
        const monthlyFee = planFees[newPlan] ?? 0;

        try {
            await executeWithRetry(async () => {
                await prisma.platformSubscription.update({
                    where: { companyId },
                    data: { plan: newPlan, monthlyFee }
                });
                // Also update company plan
                await prisma.company.update({
                    where: { id: companyId },
                    data: { plan: newPlan }
                });
            });

            await this.recordBillingEvent(companyId, 'PLATFORM_FEE', 0, 'SUCCESS',
                `Plan upgraded to ${newPlan}`);

            const currentSubscription = await prisma.platformSubscription.findUnique({
                where: { companyId },
                select: {
                    nextBillingDate: true
                }
            });

            WhatsAppNotificationService.sendSubscriptionRenewedNotification({
                companyId,
                planName: newPlan,
                monthlyFee,
                currency: 'EGP',
                billingCycle: 'monthly',
                nextBillingDate: currentSubscription?.nextBillingDate || null
            }).catch((notificationError) => {
                console.error(`❌ [BILLING] Failed to send subscription renewal notification for ${companyId}:`, notificationError.message);
            });

            console.log(`✅ [BILLING] Plan upgraded for ${companyId} → ${newPlan}`);
        } catch (error) {
            console.error(`❌ [BILLING] upgradePlan error for ${companyId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get plan limits from the PlanLimit table.
     */
    async getPlanLimits(plan) {
        const prisma = getSharedPrismaClient();
        try {
            const limits = await prisma.planLimit.findUnique({ where: { plan } });
            if (!limits) {
                // Sensible defaults if no limits row exists
                return { maxEmployees: 5, maxProducts: 100, maxOrdersPerMonth: 500, hasAdvancedReports: false, hasAPIAccess: false };
            }
            return limits;
        } catch (error) {
            console.error(`❌ [BILLING] getPlanLimits error for ${plan}:`, error.message);
            return null;
        }
    }

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
