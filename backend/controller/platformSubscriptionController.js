const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");
const {
  applyPlanLimitBonuses,
  buildCompanyBonusSnapshot,
  getUsagePercentage,
} = require("../services/platformSignupCouponService");
const WhatsAppNotificationService = require("../services/whatsapp/WhatsAppNotificationService");

const DEFAULT_PLAN_FEES = {
  BASIC: 99,
  PRO: 199,
  ENTERPRISE: 499,
};

const getDefaultMonthlyFee = (plan) =>
  DEFAULT_PLAN_FEES[plan] || DEFAULT_PLAN_FEES.BASIC;

const getNextBillingDate = () => {
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  return nextBillingDate;
};

const OPTIONAL_SIGNUP_COMPANY_FIELDS = Object.freeze([
  "signupTrialBonusDays",
  "signupBonusUsers",
  "signupBonusProducts",
  "signupBonusOrdersPerMonth",
  "signupBonusCustomers",
  "signupCouponCode",
]);

const COMPANY_SELECT_WITH_OPTIONAL_SIGNUP_FIELDS = Object.freeze({
  id: true,
  name: true,
  plan: true,
  signupTrialBonusDays: true,
  signupBonusUsers: true,
  signupBonusProducts: true,
  signupBonusOrdersPerMonth: true,
  signupBonusCustomers: true,
  signupCouponCode: true,
});

const COMPANY_BASE_SELECT = Object.freeze({
  id: true,
  name: true,
  plan: true,
});

const EMPTY_SIGNUP_BONUS_COMPANY_FIELDS = Object.freeze({
  signupTrialBonusDays: 0,
  signupBonusUsers: 0,
  signupBonusProducts: 0,
  signupBonusOrdersPerMonth: 0,
  signupBonusCustomers: 0,
  signupCouponCode: null,
});

const withSignupBonusDefaults = (company) =>
  company ? { ...EMPTY_SIGNUP_BONUS_COMPANY_FIELDS, ...company } : company;

const isMissingOptionalCompanyColumnError = (error) => {
  const message = String(error?.message || "");
  return OPTIONAL_SIGNUP_COMPANY_FIELDS.some((field) =>
    message.includes(field),
  );
};

const findCompanyWithOptionalSignupFields = async (prisma, companyId) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT_WITH_OPTIONAL_SIGNUP_FIELDS,
    });

    return withSignupBonusDefaults(company);
  } catch (error) {
    if (!isMissingOptionalCompanyColumnError(error)) {
      throw error;
    }

    console.warn(
      "[platformSubscription] Falling back to base company fields because signup bonus columns are missing:",
      error.message,
    );

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_BASE_SELECT,
    });

    return withSignupBonusDefaults(company);
  }
};

const buildSyntheticSubscription = ({ company, monthlyFee }) => ({
  id: `fallback-${company.id}`,
  companyId: company.id,
  plan: company.plan || "BASIC",
  monthlyFee,
  status: "ACTIVE",
  billingDay: 1,
  nextBillingDate: getNextBillingDate(),
  lastBillingDate: null,
  failedAttempts: 0,
  isFallback: true,
  company: {
    name: company.name,
    plan: company.plan || "BASIC",
  },
});

/**
 * @route GET /api/v1/platform-subscription
 * @desc Get current platform subscription
 * @access Protected
 */
exports.getSubscription = async (req, res) => {
  try {
    const { companyId } = req.user;

    const { company, subscription, planConfig } = await executeWithRetry(
      async () => {
        const prisma = getSharedPrismaClient();
        const [company, subscription] = await Promise.all([
          findCompanyWithOptionalSignupFields(prisma, companyId),
          prisma.platformSubscription.findUnique({
            where: { companyId },
            include: {
              company: {
                select: {
                  name: true,
                  plan: true,
                },
              },
            },
          }),
        ]);

        const planConfig = company
          ? await prisma.planConfiguration.findFirst({
              where: {
                isActive: true,
                planType: company.plan || "BASIC",
              },
              select: { price: true },
            })
          : null;

        return { company, subscription, planConfig };
      },
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const resolvedSubscription =
      subscription ||
      buildSyntheticSubscription({
        company,
        monthlyFee: planConfig?.price ?? getDefaultMonthlyFee(company.plan),
      });

    res.json({
      success: true,
      data: resolvedSubscription,
    });
  } catch (error) {
    console.error("Error fetching platform subscription:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب بيانات الاشتراك",
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/plans
 * @desc Get all available platform plans with limits
 * @access Public
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await executeWithRetry(async () => {
      return await getSharedPrismaClient().planLimit.findMany({
        orderBy: { plan: "asc" },
      });
    });

    const dbConfigs = await getSharedPrismaClient().planConfiguration.findMany({
      where: { isActive: true },
    });

    // إضافة معلومات التسعير
    const plansWithPricing = plans.map((plan) => {
      const dbConfig = dbConfigs.find((c) => c.planType === plan.plan);

      let monthlyFee = dbConfig
        ? dbConfig.price
        : plan.plan === "BASIC"
          ? 99
          : plan.plan === "PRO"
            ? 199
            : 499;
      let features = [];

      if (dbConfig && dbConfig.features && Array.isArray(dbConfig.features)) {
        features = dbConfig.features;
      } else if (
        dbConfig &&
        dbConfig.features &&
        typeof dbConfig.features === "object"
      ) {
        // Fallback or mapping if features is an object in one system and array in another
        features = Object.entries(dbConfig.features).map(
          ([k, v]) => `${k}: ${v}`,
        );
      } else {
        // Fallback defaults
        if (plan.plan === "BASIC") {
          features = [
            "حتى 5 موظفين",
            "حتى 100 منتج",
            "حتى 500 طلب/شهر",
            "دعم عادي",
            "تقارير أساسية",
          ];
        } else if (plan.plan === "PRO") {
          features = [
            "حتى 20 موظف",
            "حتى 500 منتج",
            "حتى 2000 طلب/شهر",
            "دعم أولوية",
            "تقارير متقدمة",
            "API Access",
          ];
        } else if (plan.plan === "ENTERPRISE") {
          features = [
            "موظفين غير محدود",
            "منتجات غير محدودة",
            "طلبات غير محدودة",
            "دعم مخصص 24/7",
            "تقارير مخصصة",
            "API مخصص",
            "White Label",
            "مدير حساب مخصص",
          ];
        }
      }

      return {
        ...plan,
        monthlyFee,
        features,
      };
    });

    res.json({
      success: true,
      data: plansWithPricing,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب الخطط",
    });
  }
};

/**
 * @route POST /api/v1/platform-subscription/upgrade
 * @desc Upgrade platform subscription
 * @access Protected
 */
exports.upgradePlan = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { newPlan } = req.body;
    const existingSubscription = await getSharedPrismaClient().platformSubscription.findUnique({
      where: { companyId },
      select: { id: true }
    });

    if (!["BASIC", "PRO", "ENTERPRISE"].includes(newPlan)) {
      return res.status(400).json({
        success: false,
        message: "خطة غير صالحة",
      });
    }

    // حساب الرسوم الجديدة
    let monthlyFee = 99;
    if (newPlan === "PRO") monthlyFee = 199;
    if (newPlan === "ENTERPRISE") monthlyFee = 499;

    const result = await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        // تحديث الاشتراك
        const subscription = await tx.platformSubscription.upsert({
          where: { companyId },
          update: {
            plan: newPlan,
            monthlyFee,
          },
          create: {
            companyId,
            plan: newPlan,
            monthlyFee,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // تحديث خطة الشركة
        await tx.company.update({
          where: { id: companyId },
          data: { plan: newPlan },
        });
        // تسجيل في سجل الفواتير
        const txBilling = await tx.billingHistory.create({
          data: {
            companyId,
            type: "PLATFORM_FEE",
            amount: monthlyFee,
            description: `ترقية الخطة إلى ${newPlan}`,
            status: "SUCCESS",
          },
        });

        return { subscription, billingHistoryId: txBilling.id };
      });
    });

    // 🚀 Trigger Partner Commission Distribution asynchronously
    if (result.billingHistoryId) {
      const platformPartnerService = require("../services/platformPartner.service");
      platformPartnerService
        .distributeCommissions(result.billingHistoryId)
        .catch((err) => {
          console.error(
            "❌ Error distributing commissions after plan upgrade:",
            err,
          );
        });
    }

    const subscriptionEvent = existingSubscription
      ? WhatsAppNotificationService.sendSubscriptionRenewedNotification({
          companyId,
          planName: newPlan,
          monthlyFee,
          currency: "EGP",
          billingCycle: "monthly",
          nextBillingDate: result.subscription?.nextBillingDate || null,
        })
      : WhatsAppNotificationService.sendSubscriptionCreatedNotification({
          companyId,
          planName: newPlan,
          monthlyFee,
          currency: "EGP",
          billingCycle: "monthly",
          nextBillingDate: result.subscription?.nextBillingDate || null,
          trialDays: 0,
        });

    subscriptionEvent.catch((notificationError) => {
      console.error("❌ Error sending platform subscription notification:", notificationError);
    });

    res.json({
      success: true,
      message: "تم ترقية الخطة بنجاح",
      data: result.subscription,
    });
  } catch (error) {
    console.error("Error upgrading plan:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في ترقية الخطة",
    });
  }
};

/**
 * @route POST /api/v1/platform-subscription/cancel
 * @desc Cancel platform subscription
 * @access Protected
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.update({
        where: { companyId },
        data: {
          status: "CANCELLED",
        },
      });
    });

    WhatsAppNotificationService.sendSubscriptionCancelledNotification({
      companyId,
      planName: result?.plan,
      reason: result?.cancelReason || "إلغاء من لوحة التحكم",
      endDate: result?.updatedAt || new Date(),
    }).catch((notificationError) => {
      console.error("❌ Error sending platform cancellation notification:", notificationError);
    });

    res.json({
      success: true,
      message: "تم إلغاء الاشتراك بنجاح",
      data: result,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في إلغاء الاشتراك",
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/billing-history
 * @desc Get billing history
 * @access Protected
 */
exports.getBillingHistory = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, type } = req.query;

    const where = { companyId };
    if (type) {
      where.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().billingHistory.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        getSharedPrismaClient().billingHistory.count({ where }),
      ]);
    });

    res.json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب سجل الفواتير",
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/usage-stats
 * @desc Get current usage statistics vs plan limits
 * @access Protected
 */
exports.getUsageStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const { company, subscription, planConfig } = await executeWithRetry(
      async () => {
        const prisma = getSharedPrismaClient();
        const [company, subscription] = await Promise.all([
          findCompanyWithOptionalSignupFields(prisma, companyId),
          prisma.platformSubscription.findUnique({
            where: { companyId },
          }),
        ]);

        const planConfig = company
          ? await prisma.planConfiguration.findFirst({
              where: {
                isActive: true,
                planType: company.plan || "BASIC",
              },
              select: { price: true },
            })
          : null;

        return { company, subscription, planConfig };
      },
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const resolvedSubscription =
      subscription ||
      buildSyntheticSubscription({
        company,
        monthlyFee: planConfig?.price ?? getDefaultMonthlyFee(company.plan),
      });

    // جلب حدود الخطة
    const planLimit = await executeWithRetry(async () => {
      return await getSharedPrismaClient().planLimit.findUnique({
        where: { plan: company.plan || "BASIC" },
      });
    });

    // حساب الاستخدام الحالي
    const [employeeCount, productCount, orderCount, customerCount] =
      await executeWithRetry(async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return await Promise.all([
          getSharedPrismaClient().employee.count({ where: { companyId } }),
          getSharedPrismaClient().product.count({ where: { companyId } }),
          getSharedPrismaClient().order.count({
            where: {
              companyId,
              createdAt: { gte: startOfMonth },
            },
          }),
          getSharedPrismaClient().customer.count({ where: { companyId } }),
        ]);
      });

    const adjustedLimits = applyPlanLimitBonuses(planLimit, company);
    const usage = {
      employees: {
        current: employeeCount,
        limit: adjustedLimits?.maxEmployees || -1,
        percentage: getUsagePercentage(
          employeeCount,
          adjustedLimits?.maxEmployees || -1,
        ),
      },
      products: {
        current: productCount,
        limit: adjustedLimits?.maxProducts || -1,
        percentage: getUsagePercentage(
          productCount,
          adjustedLimits?.maxProducts || -1,
        ),
      },
      ordersThisMonth: {
        current: orderCount,
        limit: adjustedLimits?.maxOrdersPerMonth || -1,
        percentage: getUsagePercentage(
          orderCount,
          adjustedLimits?.maxOrdersPerMonth || -1,
        ),
      },
      customers: {
        current: customerCount,
        limit: adjustedLimits?.maxCustomers || -1,
        percentage: getUsagePercentage(
          customerCount,
          adjustedLimits?.maxCustomers || -1,
        ),
      },
    };

    res.json({
      success: true,
      data: {
        plan: company.plan || "BASIC",
        subscription: resolvedSubscription,
        limits: adjustedLimits,
        couponBenefits: {
          code: company.signupCouponCode || null,
          ...buildCompanyBonusSnapshot(company),
        },
        usage,
      },
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب إحصائيات الاستخدام",
    });
  }
};
