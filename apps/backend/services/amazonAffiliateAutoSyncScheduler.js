/**
 * 🔄 Amazon Affiliate Auto Sync Scheduler
 * مزامنة تلقائية لأسعار ومخزون منتجات أمازون للشركات المفعّلة.
 * يفحص الشركات التي لديها autoSyncEnabled = true ويعيد مزامنة روابطها دورياً.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const { syncProducts } = require('./amazonAffiliateService');

class AmazonAffiliateAutoSyncScheduler {
  constructor() {
    this.isRunning = false;
    this.timerId = null;
    // فاصل افتراضي 60 دقيقة (مزامنة الأسعار لا تحتاج تردداً أعلى)
    this.defaultIntervalMinutes = 60;
  }

  /**
   * بدء المزامنة التلقائية لكل الشركات المفعّلة.
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [AMAZON-AFFILIATE-SCHEDULER] Already running');
      return;
    }
    this.isRunning = true;
    console.log('🚀 [AMAZON-AFFILIATE-SCHEDULER] Starting auto sync scheduler...');

    // أول مزامنة بعد 60 ثانية من إقلاع السيرفر
    setTimeout(() => {
      this.syncAllCompanies().catch((e) => console.error('[AMAZON-AFFILIATE-SCHEDULER] initial run failed', e.message));
    }, 60000);

    this.timerId = setInterval(() => {
      this.syncAllCompanies().catch((e) => console.error('[AMAZON-AFFILIATE-SCHEDULER] run failed', e.message));
    }, this.defaultIntervalMinutes * 60 * 1000);

    console.log(`✅ [AMAZON-AFFILIATE-SCHEDULER] Started - syncing every ${this.defaultIntervalMinutes} minutes`);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    console.log('🛑 [AMAZON-AFFILIATE-SCHEDULER] Stopped');
  }

  /**
   * مزامنة كل الشركات المفعّلة للأفليت الأمازوني.
   */
  async syncAllCompanies() {
    try {
      const prisma = getSharedPrismaClient();
      const companies = await prisma.amazonAffiliateSettings.findMany({
        where: { autoSyncEnabled: true, isEnabled: true },
        select: { companyId: true },
      });

      if (companies.length === 0) {
        return;
      }

      console.log(`🔄 [AMAZON-AFFILIATE-SCHEDULER] Syncing ${companies.length} companies...`);
      for (const { companyId } of companies) {
        try {
          const result = await syncProducts(companyId);
          console.log(
            `✅ [AMAZON-AFFILIATE-SCHEDULER] company ${companyId}: ${result.succeeded}/${result.succeeded + result.failed} synced (${result.status})`
          );
        } catch (error) {
          console.error(`❌ [AMAZON-AFFILIATE-SCHEDULER] company ${companyId} failed:`, error.message);
        }
      }
    } catch (error) {
      console.error('[AMAZON-AFFILIATE-SCHEDULER] syncAllCompanies error:', error.message);
    }
  }
}

let instance = null;
const getAmazonAffiliateAutoSyncScheduler = () => {
  if (!instance) {
    instance = new AmazonAffiliateAutoSyncScheduler();
  }
  return instance;
};

module.exports = {
  AmazonAffiliateAutoSyncScheduler,
  getAmazonAffiliateAutoSyncScheduler,
};
