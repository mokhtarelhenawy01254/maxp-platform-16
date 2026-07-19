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
