const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery, healthCheck } = require('./sharedDatabase');

class BillingNotificationService {
  constructor() {
    this.isRunning = false;
    this.scheduledTasks = [];
  }

  /**
   * Start the billing notification service
   */
  start() {
    if (this.isRunning) return;

    // Schedule daily check at 9:00 AM
    const dailyTask = cron.schedule('0 9 * * *', () => {
      this.runDailyChecks();
    }, {
      scheduled: false,
      timezone: 'Africa/Cairo'
    });

    dailyTask.start();
    this.scheduledTasks.push(dailyTask);
    this.isRunning = true;

    // Run initial check
    this.runDailyChecks();
  }

  /**
   * Stop the billing notification service
   */
  stop() {
    if (!this.isRunning) return;
    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks = [];
    this.isRunning = false;
  }

  /**
   * Run daily checks for billing notifications
   */
  async runDailyChecks() {
    try {
      try {
        const db = await healthCheck();
        if (db?.status === 'cooldown') return;
      } catch { /* ignore health check errors */ }

      await safeQuery(async () => {
        await this.checkUpcomingRenewals();
      }, 2);

      await safeQuery(async () => {
        await this.checkLowBalances();
      }, 2);

      await safeQuery(async () => {
        await this.sweepSubscriptionHeldOrders();
      }, 2);

    } catch (error) {
      console.error('❌ [BILLING] Error in daily billing checks:', error.message);
    }
  }

  /**
   * Check for upcoming subscription renewals (7 days, 3 days, 1 day)
   */
  async checkUpcomingRenewals() {
    try {
      const now = new Date();
      const checkDays = [7, 3, 1];

      for (const days of checkDays) {
        const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const renewals = await getSharedPrismaClient().platformSubscription.findMany({
          where: {
            status: 'ACTIVE',
            nextBillingDate: {
              gte: new Date(targetDate.getTime() - 12 * 60 * 60 * 1000), // 12 hours before
              lte: new Date(targetDate.getTime() + 12 * 60 * 60 * 1000)  // 12 hours after
            }
          },
          include: {
            company: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        if (renewals.length > 0) {
          await this.sendRenewalReminders(renewals, days);
        }
      }
    } catch (error) {
      console.error('❌ [BILLING] Error checking upcoming renewals:', error.message);
    }
  }

  /**
   * Check for low wallet balances and notify company admins (once per day)
   */
  async checkLowBalances() {
    try {
      const lowBalanceWallets = await getSharedPrismaClient().companyWallet.findMany({
        where: {
          balance: { lt: 100 }, // أقل من 100 جنيه
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      for (const wallet of lowBalanceWallets) {
        const companyId = wallet.companyId;
        const balance = Number(wallet.balance);

        // منع الإزعاج: لا نرسل تنبيهاً لنفس الشركة أكثر من مرة في اليوم
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const alreadyNotified = await getSharedPrismaClient().notification.count({
          where: {
            companyId,
            type: 'wallet_low_balance',
            createdAt: { gte: startOfDay },
          },
        });

        if (alreadyNotified > 0) continue;

        const admins = await getSharedPrismaClient().user.findMany({
          where: {
            companyId,
            role: { in: ['OWNER', 'COMPANY_ADMIN', 'MANAGER'] },
            isActive: true,
          },
          select: { id: true },
        });

        if (admins.length === 0) continue;

        for (const admin of admins) {
          await getSharedPrismaClient().notification.create({
            data: {
              companyId,
              userId: admin.id,
              type: 'wallet_low_balance',
              title: '⚠️ رصيد المحفظة منخفض',
              message: `رصيد محفظتك الحالي ${balance} جنيه. عند نفاد الرصيد سيتم تعليق الطلبات الجديدة من المتجر حتى يتم شحن الرصيد.`,
              data: { balance },
            },
          });
        }

        console.log(`✅ [BILLING] Low balance notification sent to ${admins.length} admin(s) for company ${companyId}: ${balance} EGP`);
      }
    } catch (error) {
      console.error('❌ [BILLING] Error in checkLowBalances:', error.message);
    }
  }

  /**
   * سكان يومي: تحرير الطلبات اليدوية المعلّقة بسبب انتهاء الاشتراك
   * لكل الشركات اللي رجع اشتراك الطلبات اليدوية عندها ACTIVE/TRIAL.
   */
  async sweepSubscriptionHeldOrders() {
    try {
      const companies = await getSharedPrismaClient().order.findMany({
        where: { billingHoldAt: { not: null }, billingHoldAmount: null },
        distinct: ['companyId'],
        select: { companyId: true },
      });

      if (companies.length === 0) return;

      const { releaseSubscriptionHeldOrders } = require('./pendingBillingService');
      for (const row of companies) {
        try {
          await releaseSubscriptionHeldOrders(row.companyId);
        } catch (err) {
          console.error(`⚠️ [BILLING] Sweep release failed for company ${row.companyId}:`, err.message);
        }
      }
    } catch (error) {
      console.error('❌ [BILLING] Error in sweepSubscriptionHeldOrders:', error.message);
    }
  }

  /**
   * Send renewal reminder notifications
   */
  async sendRenewalReminders(subscriptions, daysUntilRenewal) {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return;

    for (const subscription of subscriptions) {
      try {
        const companyEmail = subscription.company?.email || subscription.companyId;
        console.log(`📧 [BILLING] Sending ${daysUntilRenewal}-day renewal reminder to ${companyEmail}`);

        // NOTE (2026-10-15 audit): Do NOT write to billingHistory here.
        // Previously, a false SUCCESS record with amount = subscription.monthlyFee was created,
        // which seeded 13,363 phantom records (~3.2M EGP false revenue) in billingHistory.
        // billingHistory is strictly for actual financial transactions, never notification logs.
      } catch (error) {
        console.error(`❌ [BILLING] Error sending renewal reminder to ${subscription.company?.email || subscription.companyId}:`, error.message);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledTasks: this.scheduledTasks.length,
      lastCheck: new Date().toISOString()
    };
  }
}

const billingNotificationService = new BillingNotificationService();
billingNotificationService.BillingNotificationService = BillingNotificationService;
module.exports = billingNotificationService;
