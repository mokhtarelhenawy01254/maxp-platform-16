const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/super-admin/platform/subscriptions
 * @desc Get all platform subscriptions with company details
 * @access Super Admin
 */
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().platformSubscription.findMany({
          where,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true
              }
            }
          },
          orderBy: { nextBillingDate: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        getSharedPrismaClient().platformSubscription.count({ where })
      ]);
    });

    // Calculate statistics
    const stats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.groupBy({
        by: ['status'],
        _count: true
      });
    });

    res.json({
      success: true,
      data: subscriptions,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الاشتراكات'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/platform/billing-overview
 * @desc Get billing overview and revenue analytics
 * @access Super Admin
 */
exports.getBillingOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get revenue by type using BillingHistory model
    const revenueByType = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.groupBy({
        by: ['type'],
        where: {
          status: 'SUCCESS',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        _sum: { amount: true },
        _count: true
      });
    });

    // Get failed payments using BillingHistory model
    const failedPayments = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.findMany({
        where: {
          status: 'FAILED',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    // Get total revenue from successful billing history
    const totalRevenueSum = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          status: 'SUCCESS',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        _sum: { amount: true }
      });
    });

    // Get active subscriptions count
    const activeSubscriptions = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.count({
        where: { status: 'ACTIVE' }
      });
    });

    res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenueSum._sum.amount || 0),
        activeSubscriptions: Number(activeSubscriptions || 0),
        revenueByType: revenueByType.map(r => ({ 
          ...r, 
          _sum: { amount: Number(r._sum.amount || 0) },
          _count: Number(r._count || 0)
        })),
        failedPayments: failedPayments.map(p => ({
          ...p,
          amount: Number(p.amount || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching billing overview:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب نظرة عامة على الفواتير',
      error: error.message
    });
  }
};

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

/**
 * @route PUT /api/v1/super-admin/platform/subscription/:id
 * @desc Update subscription status or plan
 * @access Super Admin
 */
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = {};
    if (status) updateData.status = status;

    const subscription = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الاشتراك'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/platform/plan-limit/:plan
 * @desc Update plan limits
 * @access Super Admin
 */
// ponytail: updatePlanLimit removed — plan limits system deleted

/**
 * @route POST /api/v1/super-admin/platform/retry-failed-payment/:id
 * @desc Retry failed payment
 * @access Super Admin
 */
exports.retryFailedPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const billingRecord = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.findUnique({
        where: { id },
        include: {
          company: {
            include: {
              wallet: true,
              platformSubscription: true
            }
          }
        }
      });
    });

    if (!billingRecord) {
      return res.status(404).json({
        success: false,
        message: 'سجل الفاتورة غير موجود'
      });
    }

    if (billingRecord.status === 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'هذه الفاتورة مدفوعة بالفعل'
      });
    }

    // Check wallet balance
    const wallet = billingRecord.company.wallet;
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: 'محفظة الشركة غير موجودة'
      });
    }

    const amount = parseFloat(billingRecord.amount.toString());
    const balance = parseFloat(wallet.balance.toString());

    if (balance < amount) {
      return res.status(400).json({
        success: false,
        message: `رصيد المحفظة غير كافٍ لإعادة محاولة الدفع. الرصيد الحالي: ${balance.toLocaleString('ar-EG')} ج، المطلوب: ${amount.toLocaleString('ar-EG')} ج. يرجى شحن المحفظة أولاً.`
      });
    }

    // Execute payment retry in a transaction
    await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        // 1. Deduct from wallet
        await tx.companyWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
            totalSpent: { increment: amount }
          }
        });

        // 2. Create transaction record
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: amount,
            type: 'DEBIT',
            status: 'COMPLETED',
            description: `إعادة محاولة دفع فاتورة منصة: ${billingRecord.description}`,
            referenceId: billingRecord.id
          }
        });

        // 3. Update billing history
        await tx.billingHistory.update({
          where: { id: billingRecord.id },
          data: { status: 'SUCCESS' }
        });

        // 4. Update platform subscription
        if (billingRecord.company.platformSubscription) {
          await tx.platformSubscription.update({
            where: { id: billingRecord.company.platformSubscription.id },
            data: {
              status: 'ACTIVE',
              failedAttempts: 0,
              lastBillingDate: new Date()
            }
          });
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إعادة محاولة الدفع بنجاح وخصم المبلغ من المحفظة'
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة محاولة الدفع',
      error: error.message
    });
  }
};

module.exports = exports;
