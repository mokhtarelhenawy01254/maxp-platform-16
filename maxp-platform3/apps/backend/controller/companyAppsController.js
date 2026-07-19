const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/my-apps
 * @desc Get all installed apps for the company
 * @access Protected
 */
exports.getMyApps = async (req, res) => {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لعرض التطبيقات'
      });
    }

    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findMany({
        where: {
          companyId,
          status: { in: ['TRIAL', 'ACTIVE'] },
          app: {
            category: {
              notIn: ['THEME', 'TEMPLATE'],
            },
          },
        },
        include: {
          app: true,
          usageLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    // Calculate usage summary for each app
    const appsWithUsage = await Promise.all(apps.map(async (companyApp) => {
      const usageStats = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.aggregate({
          where: {
            companyAppId: companyApp.id,
            createdAt: {
              gte: new Date(new Date().setDate(1)) // This month
            }
          },
          _sum: {
            totalCost: true,
            quantity: true
          }
        });
      });

      return {
        ...companyApp,
        monthlyUsage: {
          totalCost: usageStats._sum.totalCost || 0,
          totalQuantity: usageStats._sum.quantity || 0
        }
      };
    }));

    res.json({
      success: true,
      data: appsWithUsage
    });
  } catch (error) {
    console.error('Error fetching my apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات المفعلة',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/my-apps/:id
 * @desc Get details of a specific installed app
 * @access Protected
 */
exports.getAppDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لعرض تفاصيل التطبيق'
      });
    }

    const companyApp = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          app: {
            include: {
              pricingRules: {
                where: { isActive: true }
              }
            }
          },
          usageLogs: {
            take: 50,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    if (!companyApp) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: companyApp
    });
  } catch (error) {
    console.error('Error fetching app details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الأداة',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/my-apps/:id/usage
 * @desc Get usage statistics for an app
 * @access Protected
 */
exports.getAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لعرض الاستخدام'
      });
    }
    const { startDate, endDate, groupBy = 'day', limit } = req.query;

    const companyApp = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findFirst({
        where: { id, companyId }
      });
    });

    if (!companyApp) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    const where = {
      companyAppId: id
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const resolvedLimit = Math.max(
      20,
      Math.min(500, Number.parseInt(String(limit || '100'), 10) || 100),
    );

    const [usageLogs, summary] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().appUsageLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: resolvedLimit
        }),
        getSharedPrismaClient().appUsageLog.aggregate({
          where,
          _sum: {
            totalCost: true,
            quantity: true
          },
          _count: {
            id: true
          }
        })
      ]);
    });

    // Group by feature
    const byFeature = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appUsageLog.groupBy({
        by: ['feature'],
        where,
        _sum: {
          totalCost: true,
          quantity: true
        },
        _count: {
          id: true
        }
      });
    });

    res.json({
      success: true,
      data: {
        logs: usageLogs,
        summary: {
          totalCost: summary._sum.totalCost || 0,
          totalQuantity: summary._sum.quantity || 0,
          totalActions: summary._count.id
        },
        byFeature
      }
    });
  } catch (error) {
    console.error('Error fetching app usage:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الاستخدام',
      error: error.message
    });
  }
};

/**
 * @route PUT /api/v1/my-apps/:id/settings
 * @desc Update app settings
 * @access Protected
 */
exports.updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لتحديث الإعدادات'
      });
    }
    const { settings } = req.body;

    const companyApp = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findFirst({
        where: { id, companyId }
      });
    });

    if (!companyApp) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    const updated = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id },
        data: { settings }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('Error updating app settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الإعدادات',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/my-apps/:id/upgrade
 * @desc Upgrade app from trial to active
 * @access Protected
 */
exports.upgradeApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لترقية التطبيق'
      });
    }

    const companyApp = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findFirst({
        where: { id, companyId },
        include: { app: true }
      });
    });

    if (!companyApp) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    if (companyApp.status !== 'TRIAL') {
      return res.status(400).json({
        success: false,
        message: 'الأداة ليست في فترة تجريبية'
      });
    }

    // Calculate next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const updated = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          validUntil: nextBillingDate
        }
      });
    });

    res.json({
      success: true,
      message: `تم ترقية ${companyApp.app.name} بنجاح! 🎉`,
      data: updated
    });
  } catch (error) {
    console.error('Error upgrading app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في ترقية الأداة',
      error: error.message
    });
  }
};

/**
 * @route DELETE /api/v1/my-apps/:id
 * @desc Cancel/uninstall an app
 * @access Protected
 */
exports.cancelApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لإلغاء التطبيق'
      });
    }

    const companyApp = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findFirst({
        where: { id, companyId },
        include: { app: true }
      });
    });

    if (!companyApp) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id },
        data: {
          status: 'CANCELLED'
        }
      });
    });

    res.json({
      success: true,
      message: `تم إلغاء ${companyApp.app.name} بنجاح`
    });
  } catch (error) {
    console.error('Error cancelling app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الأداة',
      error: error.message
    });
  }
};
