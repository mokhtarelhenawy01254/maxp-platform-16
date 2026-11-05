const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const attendanceService = require('../services/hr/attendanceService');

/**
 * ⏰ Missing Punches Daily Cron (task 1e422c5a)
 *
 * The missing-punches report existed only behind a manual endpoint
 * (`POST /hr/attendance/missing-punches/check-daily`), so a day with a broken
 * fingerprint device produced no attempt rows and no notification until someone
 * opened the HR screen. This job runs `checkDailyMissingPunches` for every active
 * company once a day.
 *
 * Idempotency: `checkDailyMissingPunches` upserts per (company, user, date);
 * re-running for the same day does not duplicate attempts. The in-process guard
 * below only prevents overlapping ticks.
 */
class MissingPunchesDailyCron {
  constructor() {
    this.isRunning = false;
    this.lastRunDate = null;
  }

  start() {
    // 21:30 server time: after the shift end, before the payroll day rolls over.
    cron.schedule('30 21 * * *', async () => {
      await this.runOnce();
    });
    console.log('✅ [MISSING-PUNCHES-CRON] Daily missing-punches check scheduled (21:30)');
  }

  async runOnce() {
    if (this.isRunning) {
      console.log('⚠️ [MISSING-PUNCHES-CRON] Previous run still in progress, skipping');
      return { skipped: true };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastRunDate === today) {
      console.log(`⚠️ [MISSING-PUNCHES-CRON] Already ran for ${today}, skipping`);
      return { skipped: true, reason: 'already_ran_today' };
    }

    this.isRunning = true;
    const prisma = getSharedPrismaClient();
    const results = { companies: 0, failed: 0, totalMissing: 0 };

    try {
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const company of companies) {
        try {
          const report = await attendanceService.checkDailyMissingPunches(company.id);
          const missing = report?.missingCount ?? report?.summary?.totalMissingPunches ?? 0;
          results.companies += 1;
          results.totalMissing += Number(missing) || 0;
          if (Number(missing) > 0) {
            console.log(`🔔 [MISSING-PUNCHES-CRON] ${company.name}: ${missing} missing punch attempt(s)`);
          }
        } catch (error) {
          results.failed += 1;
          console.error(`❌ [MISSING-PUNCHES-CRON] ${company.name || company.id}: ${error.message}`);
        }
      }

      this.lastRunDate = today;
      console.log(
        `✅ [MISSING-PUNCHES-CRON] done — companies=${results.companies} failed=${results.failed} missing=${results.totalMissing}`,
      );
      return results;
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new MissingPunchesDailyCron();
