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
        await this.checkTrialExpirations();
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
   * Check for trial expirations
   * Expires TRIAL subscriptions where trialEndDate has passed.
   * Sends reminder notifications at 7, 3, and 1 day before expiry.
   */
  async checkTrialExpirations() {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();

      // ——— Send reminders for trials nearing expiry ———
      const reminderDays = [7, 3, 1];
      for (const days of reminderDays) {
        const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const expiringTrials = await prisma.platformSubscription.findMany({
          where: {
            status: 'TRIAL',
            trialEndDate: {
              gte: new Date(targetDate.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(targetDate.getTime() + 12 * 60 * 60 * 1000),
            },
          },
          include: {
            company: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        });

        for (const sub of expiringTrials) {
          console.log(`📧 [BILLING] Trial expiry reminder (${days}d) for ${sub.company.email}`);

          await prisma.billingHistory.create({
            data: {
              companyId: sub.companyId,
              type: 'PLATFORM_FEE',
              amount: 0,
              status: 'SUCCESS',
              description: `Trial expiry reminder: ${days} days remaining`,
            },
          });

          // WhatsApp notifications will be added in Sprint 5
        }
      }

      // ——— Expire trials where trialEndDate has passed ———
      const expiredTrials = await prisma.platformSubscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndDate: { lte: now },
        },
        include: {
          company: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      for (const sub of expiredTrials) {
        await prisma.platformSubscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        });

        await prisma.billingHistory.create({
          data: {
            companyId: sub.companyId,
            type: 'PLATFORM_FEE',
            amount: 0,
            status: 'EXPIRED',
            description: 'Trial period ended — subscription expired',
          },
        });

        console.log(`⏰ [BILLING] Trial expired for company ${sub.companyId} (${sub.company.name})`);
      }

      if (expiredTrials.length > 0) {
        console.log(`⏰ [BILLING] Expired ${expiredTrials.length} trial subscriptions`);
      }
    } catch (error) {
      console.error('❌ [BILLING] Error checking trial expirations:', error.message);
    }
  }

  /**
   * Send renewal reminder notifications
   */
  async sendRenewalReminders(subscriptions, daysUntilRenewal) {
    for (const subscription of subscriptions) {
      try {
        console.log(`📧 [BILLING] Sending ${daysUntilRenewal}-day renewal reminder to ${subscription.company.email}`);

        // Log the notification
        await getSharedPrismaClient().billingHistory.create({
          data: {
            companyId: subscription.companyId,
            type: 'PLATFORM_FEE', // Best fit type
            amount: subscription.monthlyFee,
            status: 'SUCCESS',
            description: `Renewal reminder: ${daysUntilRenewal} days remaining`
          }
        });

      } catch (error) {
        console.error(`❌ [BILLING] Error sending renewal reminder to ${subscription.company.email}:`, error.message);
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

module.exports = new BillingNotificationService();
