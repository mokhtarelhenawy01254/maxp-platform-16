const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/super-admin/platform/marketplace-stats
 * @desc Get marketplace statistics
 * @access Super Admin
 */
exports.getMarketplaceStats = async (req, res) => {
  try {
    // Get app installation stats
    const appStats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId', 'status'],
        _count: true,
        _sum: { totalSpent: true }
      });
    });

    // Get top apps by installations
    const topApps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId'],
        _count: true,
        orderBy: { _count: { appId: 'desc' } },
        take: 10
      });
    });

    // Get app details for top apps
    const appIds = topApps.map(a => a.appId);
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: { id: { in: appIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          monthlyPrice: true,
          installCount: true
        }
      });
    });

    // Get usage revenue
    const usageRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_USAGE',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    // Get subscription revenue
    const subscriptionRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_SUBSCRIPTION',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    res.json({
      success: true,
      data: {
        appStats,
        topApps: topApps.map(ta => ({
          ...ta,
          app: apps.find(a => a.id === ta.appId)
        })),
        usageRevenue: usageRevenue._sum.amount || 0,
        subscriptionRevenue: subscriptionRevenue._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات Marketplace'
    });
  }
};

module.exports = exports;
