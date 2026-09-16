const { getSharedPrismaClient } = require('./sharedDatabase');

class MonitorRetentionService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * Archives and prunes granular logs older than retentionDays.
   * Keeps monitorDailySummary permanently intact.
   * 
   * @param {string} companyId 
   * @param {number} retentionDays Default: 60 days
   */
  async archiveAndPruneOldLogs(companyId, retentionDays = 60) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    console.log(`[Retention] Pruning granular activity logs older than ${cutoffDate.toISOString()} for company: ${companyId || 'ALL'}`);

    const whereBase = companyId ? { companyId } : {};

    try {
      // 1. Prune granular 10-second activity intervals
      const prunedActivities = await this.prisma.monitorActivityLog.deleteMany({
        where: {
          ...whereBase,
          intervalStart: { lt: cutoffDate },
        },
      });

      // 2. Prune granular app switches
      const prunedApps = await this.prisma.monitorAppUsage.deleteMany({
        where: {
          ...whereBase,
          startedAt: { lt: cutoffDate },
        },
      });

      // 3. Prune granular web visits
      const prunedWeb = await this.prisma.monitorWebUsage.deleteMany({
        where: {
          ...whereBase,
          startedAt: { lt: cutoffDate },
        },
      });

      const summary = {
        success: true,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        prunedCounts: {
          activityLogs: prunedActivities.count,
          appUsage: prunedApps.count,
          webUsage: prunedWeb.count,
        },
        preserved: 'monitorDailySummary is kept permanently intact for long-term analytics',
      };

      console.log('[Retention] Prune finished successfully:', summary);
      return summary;
    } catch (error) {
      console.error('[Retention] Error during prune:', error);
      throw error;
    }
  }
}

module.exports = new MonitorRetentionService();
