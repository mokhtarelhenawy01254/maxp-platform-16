const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const redisCacheService = require('../services/redisCacheService');

/**
 * @route GET /api/v1/my-apps
 * @desc Get all installed apps for the company
 * @access Protected
 */
exports.getMyApps = async (req, res) => {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      // الحسابات من غير شركة (SUPER_ADMIN / accounts قبل اختيار شركة) مش خطأ —
      // نرجع قائمة فاضية بدل 400 عشان الصفحة متبقاش بتفشل مع كل زيارة.
      return res.json({
        success: true,
        data: [],
        companyId: null
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

    // ONE grouped aggregate instead of one query per app: with ~45 installed
    // apps, the per-app Promise.all herd fired 45 parallel RLS transactions
    // over a 25-connection pool (Prisma + PgBouncer), saturating every
    // connection and wedging this request 50s+ — which froze the whole
    // dashboard for the biggest merchants (Swan, 2026-09-01).
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const usageSums = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appUsageLog.groupBy({
        by: ['companyAppId'],
        where: {
          companyAppId: { in: apps.map((companyApp) => companyApp.id) },
          createdAt: { gte: monthStart }
        },
        _sum: {
          totalCost: true,
          quantity: true
        }
      });
    });

    const usageByApp = new Map(usageSums.map((row) => [row.companyAppId, row._sum]));

    const appsWithUsage = apps.map((companyApp) => {
      const sums = usageByApp.get(companyApp.id) || {};
      return {
        ...companyApp,
        monthlyUsage: {
          totalCost: sums.totalCost || 0,
          totalQuantity: sums.quantity || 0
        }
      };
    });

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

    const updated = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id },
        data: { settings }
      });
    });

    // مزامنة عكسية مع storePromotionSettings لو التعديل خاص بـ conversion-suite (شريط الشحن المجاني والحد)
    if (companyApp?.app?.slug === 'conversion-suite') {
      const promoUpdate = {};
      if (settings?.modules?.freeShippingBar !== undefined) {
        promoUpdate.freeShippingEnabled = Boolean(settings.modules.freeShippingBar);
      }
      if (settings?.thresholds?.freeShippingAmount !== undefined) {
        promoUpdate.freeShippingThreshold = parseFloat(settings.thresholds.freeShippingAmount) || 0;
      }
      if (Object.keys(promoUpdate).length > 0) {
        try {
          await executeWithRetry(async () => {
            return await getSharedPrismaClient().storePromotionSettings.upsert({
              where: { companyId },
              update: promoUpdate,
              create: {
                companyId,
                ...promoUpdate
              }
            });
          });
          console.log(`✅ [COMPANY-APPS] Synced storePromotionSettings from conversion-suite for company ${companyId}`);
        } catch (syncErr) {
          console.error('⚠️ [COMPANY-APPS] Failed to sync storePromotionSettings:', syncErr);
        }
      }
    }

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (cacheErr) {
      console.error('⚠️ [REDIS] error deleting storefront settings cache:', cacheErr);
    }

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

    // 🚧 عند تفعيل أداة الطلبات اليدوية → تحرير الطلبات المعلّقة بسبب انتهاء الاشتراك
    if (['manual-orders-pro'].includes(companyApp.app?.slug)) {
      try {
        const { releaseSubscriptionHeldOrders } = require('../services/pendingBillingService');
        const releaseResult = await releaseSubscriptionHeldOrders(companyId);
        if (releaseResult.released > 0) {
          console.log(`✅ [UPGRADE-APP] Released ${releaseResult.released} subscription-held order(s) for ${companyApp.app.slug}`);
        }
      } catch (releaseError) {
        console.error('⚠️ [UPGRADE-APP] Failed to release subscription-held orders:', releaseError.message);
      }
    }

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

    try {
      const client = getSharedPrismaClient();
      if (client?.activityLog?.create) {
        const userDisplayName = req.user?.name || req.user?.email || 'مستخدم النظام';
        const appName = companyApp.app?.name || 'التطبيق';
        await client.activityLog.create({
          data: {
            userId: req.user?.id || null,
            companyId,
            category: 'MARKETPLACE',
            action: 'UNINSTALL_APP',
            description: `قام ${userDisplayName} بإلغاء تثبيت تطبيق "${appName}"`,
            targetType: 'APP',
            targetId: companyApp.appId,
            targetName: appName,
            metadata: JSON.stringify({
              appSlug: companyApp.app?.slug,
              appName,
              uninstalledAt: new Date().toISOString()
            }),
            severity: 'MEDIUM',
            isSuccess: true
          }
        });
      }
    } catch (logErr) {
      console.warn('[companyApps] failed to create ActivityLog for cancelApp:', logErr.message);
    }

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (cacheErr) {
      console.error('⚠️ [REDIS] error deleting storefront settings cache:', cacheErr);
    }

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
