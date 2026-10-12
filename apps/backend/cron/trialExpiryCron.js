/**
 * Trial Expiry Cron
 * يفحص الشركات التي انتهت فترة التجربة المجانية (تفعيل تجريبي) كل 30 دقيقة
 * ويقوم بتجميد التطبيقات المثبتة أثناء التجربة وفوترة الاستهلاك حسب الاستخدام.
 */
const cron = require('node-cron');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { expireCompanyTrial } = require('../services/companyTrialService');

let isRunning = false;

async function runTrialExpiryCheck() {
  if (isRunning) {
    console.log('[TRIAL-EXPIRY-CRON] Previous run still active, skipping.');
    return;
  }

  isRunning = true;

  try {
    const prisma = getSharedPrismaClient();

    // 1. Freeze individually expired trial apps
    const expiredApps = await prisma.companyApp.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { not: null, lt: new Date() },
      },
      select: { id: true, companyId: true, appId: true, app: { select: { slug: true, name: true } } },
      take: 50,
    });

    if (expiredApps.length > 0) {
      await prisma.companyApp.updateMany({
        where: { id: { in: expiredApps.map((a) => a.id) } },
        data: { status: 'EXPIRED' },
      });
      console.log(`[TRIAL-EXPIRY-CRON] Expired ${expiredApps.length} trial app(s) whose trialEndsAt passed.`);
    }

    // 2. Expire company-level trial sessions
    const expiredCompanies = await prisma.company.findMany({
      where: {
        trialModeEnabled: true,
        trialEndsAt: { not: null, lt: new Date() },
      },
      select: { id: true, name: true },
      take: 50,
    });

    if (expiredCompanies.length === 0) {
      return;
    }

    for (const company of expiredCompanies) {
      try {
        const result = await expireCompanyTrial(company.id);
        console.log(`[TRIAL-EXPIRY-CRON] Company ${company.name} (${company.id}): frozen ${result.frozen}, billed ${result.billed}, consumption ${result.totalConsumption}`);
      } catch (err) {
        console.error(`[TRIAL-EXPIRY-CRON] Failed to expire trial for company ${company.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[TRIAL-EXPIRY-CRON] Job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startTrialExpiryCron() {
  console.log('[TRIAL-EXPIRY-CRON] Starting trial expiry scheduler...');

  // Run every 30 minutes
  cron.schedule('*/30 * * * *', runTrialExpiryCheck);

  console.log('[TRIAL-EXPIRY-CRON] Scheduler started (runs every 30 minutes)');
}

module.exports = { startTrialExpiryCron };
