const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");
const WhatsAppNotificationService = require("../services/whatsapp/WhatsAppNotificationService");
const KashierService = require("../services/kashierService");
const { marketplaceCatalogService } = require("../services/catalog/marketplaceCatalogService");
const aiServiceAdminClient = require("../services/aiServiceAdminClient");
const { getDefaultAgentTemplateSlug, buildDefaultAgentConfig } = require("../utils/getDefaultAgentTemplate");

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

const COMPANY_BASE_SELECT = Object.freeze({
  id: true,
  name: true,
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

const findCompanyWithOptionalSignupFields = async (prisma, companyId) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { ...COMPANY_BASE_SELECT, ...Object.fromEntries(OPTIONAL_SIGNUP_COMPANY_FIELDS.map(f => [f, true])) },
    });
    return withSignupBonusDefaults(company);
  } catch (error) {
    console.warn("[platformSubscription] signup bonus columns missing, falling back:", error.message);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_BASE_SELECT,
    });
    return withSignupBonusDefaults(company);
  }
};

/**
 * @route GET /api/v1/platform-subscription
 * @desc Get current platform subscription
 * @access Protected
 */
exports.getSubscription = async (req, res) => {
  try {
    const { companyId } = req.user;

    const { company, subscription } = await executeWithRetry(
      async () => {
        const prisma = getSharedPrismaClient();
        const [company, subscription] = await Promise.all([
          findCompanyWithOptionalSignupFields(prisma, companyId),
          prisma.platformSubscription.findUnique({
            where: { companyId },
            include: {
              company: {
                select: { name: true },
              },
            },
          }),
        ]);
        return { company, subscription };
      },
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const resolvedSubscription = subscription || {
      id: `fallback-${company.id}`,
      companyId: company.id,
      status: "ACTIVE",
      billingDay: 1,
      nextBillingDate: getNextBillingDate(),
      isFallback: true,
    };

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
      reason: "إلغاء من لوحة التحكم",
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
 * @route POST /api/v1/platform-subscription/messaging-checkout
 * @desc Activate AI + Inbox Bundle (MESSAGING plan, 999 EGP/month)
 * @access Protected
 */
exports.messagingCheckout = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    await prisma.$transaction(async (tx) => {
      await tx.platformSubscription.upsert({
        where: { companyId },
        update: { status: 'ACTIVE', nextBillingDate, failedAttempts: 0, lastBillingDate: new Date() },
        create: { companyId, status: 'ACTIVE', nextBillingDate, billingDay: new Date().getDate(), failedAttempts: 0, lastBillingDate: new Date(), monthlyFee: 0 }
      });
      for (const slug of ["ai-chat-basic", "unified-inbox", "whatsapp-business"]) {
        const app = await tx.marketplaceApp.findUnique({ where: { slug } });
        if (app) {
          await tx.companyApp.upsert({
            where: { companyId_appId: { companyId, appId: app.id } },
            update: { status: 'ACTIVE' },
            create: { companyId, appId: app.id, status: 'ACTIVE' }
          });
        }
      }
    });

    try {
      const agentCfg = await buildDefaultAgentConfig();
      await aiServiceAdminClient.spawnAgent({
        companyId,
        templateSlug: agentCfg.templateSlug,
        name: agentCfg.name,
        icon: agentCfg.icon,
        config: agentCfg.config,
      });
    } catch (e) {
      console.warn('[MESSAGING-CHECKOUT] Auto-create agent skipped (non-blocking):', e.message);
    }

    res.json({
      success: true,
      message: 'تم تفعيل الباقة بنجاح',
      data: { skipPayment: true, trialDays: 7 }
    });
  } catch (error) {
    console.error("[MESSAGING-CHECKOUT] Error:", error);
    res.status(500).json({ success: false, message: "خطأ أثناء إنشاء عملية الدفع" });
  }
};

/**
 * @route POST /api/v1/platform-subscription/messaging-upgrade
 * @desc Upgrade messaging trial to paid via Kashier
 * @access Protected
 */
exports.messagingUpgrade = async (req, res) => {
  try {
    const { companyId, email, phone } = req.user;
    const amount = 999;
    const prisma = getSharedPrismaClient();

    const sub = await prisma.platformSubscription.findUnique({ where: { companyId } });
    if (!sub) return res.status(400).json({ success: false, message: "لا يوجد اشتراك نشط" });

    const billingRecord = await prisma.billingHistory.create({
      data: {
        companyId,
        type: "PLATFORM_FEE",
        amount,
        description: "ترقية باقة AI + Inbox (دفع كاشير)",
        status: "PENDING"
      }
    });

    const host = req.headers.host || "maxp.online";
    const redirectUrl = `http://${host}/subscription?status=success&billingId=${billingRecord.id}`;
    const baseDomain = process.env.MAIN_DOMAIN || "maxp.online";
    const webhookUrl = `https://${baseDomain}/api/v1/public/platform-subscription/webhook`;

    const session = await KashierService.createPaymentSession({
      amount,
      currency: "EGP",
      orderId: `messaging-upgrade-${billingRecord.id}`,
      customer: { email, reference: phone || companyId },
      redirectUrl,
      webhookUrl,
      description: "AI + Inbox Bundle - دفع الاشتراك",
    }, null);

    if (!session.success) {
      await prisma.billingHistory.update({
        where: { id: billingRecord.id },
        data: { status: "FAILED", description: `فشل إنشاء جلسة الدفع: ${session.error}` }
      });
      return res.status(502).json({ success: false, message: "فشل إنشاء جلسة الدفع في كاشير" });
    }

    await prisma.billingHistory.update({
      where: { id: billingRecord.id },
      data: { referenceId: session.sessionId }
    });

    res.json({ success: true, data: { sessionUrl: session.sessionUrl, billingId: billingRecord.id } });
  } catch (error) {
    console.error("[MESSAGING-UPGRADE] Error:", error);
    res.status(500).json({ success: false, message: "خطأ أثناء إنشاء عملية الدفع" });
  }
};

/**
 * @route POST /api/v1/platform-subscription/lp-activate
 * @desc Free activation of a bundle from a landing page
 * @access Protected
 */
exports.lpActivate = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { bundleSlug } = req.body;
    if (!bundleSlug) return res.status(400).json({ success: false, message: 'bundleSlug مطلوب' });

    const bundle = await marketplaceCatalogService.getBundleBySlug(bundleSlug, { onlyActive: true });
    if (!bundle) return res.status(404).json({ success: false, message: 'الباقة غير موجودة' });

    const prisma = getSharedPrismaClient();
    const appSlugs = bundle.appSlugs || [];
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    await prisma.$transaction(async (tx) => {
      await tx.platformSubscription.upsert({
        where: { companyId },
        update: { status: 'ACTIVE', nextBillingDate, failedAttempts: 0, lastBillingDate: new Date() },
        create: { companyId, status: 'ACTIVE', nextBillingDate, billingDay: new Date().getDate(), failedAttempts: 0, lastBillingDate: new Date(), monthlyFee: 0 }
      });
      for (const slug of appSlugs) {
        const app = await tx.marketplaceApp.findUnique({ where: { slug } });
        if (app) {
          await tx.companyApp.upsert({
            where: { companyId_appId: { companyId, appId: app.id } },
            update: { status: 'ACTIVE' },
            create: { companyId, appId: app.id, status: 'ACTIVE' }
          });
        }
      }
    });

    try {
      const agentCfg = await buildDefaultAgentConfig();
      await aiServiceAdminClient.spawnAgent({
        companyId,
        templateSlug: agentCfg.templateSlug,
        name: agentCfg.name,
        icon: agentCfg.icon,
        config: agentCfg.config,
      });
    } catch (e) {
      console.warn('[LP-ACTIVATE] Auto-create agent skipped (non-blocking):', e.message);
    }

    res.json({ success: true, message: 'تم تفعيل الباقة مجاناً', data: { trialDays: 7 } });
  } catch (error) {
    console.error('[LP-ACTIVATE] Error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء التفعيل المجاني' });
  }
};

/**
 * @route POST /api/v1/platform-subscription/lp-checkout
 * @desc Paid activation of a bundle from a landing page
 * @access Protected
 */
exports.lpCheckout = async (req, res) => {
  try {
    const { companyId, email, phone } = req.user;
    const { bundleSlug } = req.body;
    if (!bundleSlug) return res.status(400).json({ success: false, message: 'bundleSlug مطلوب' });

    const bundle = await marketplaceCatalogService.getBundleBySlug(bundleSlug, { onlyActive: true });
    if (!bundle) return res.status(404).json({ success: false, message: 'الباقة غير موجودة' });

    const amount = Number(bundle.monthlyPrice);
    const prisma = getSharedPrismaClient();

    const billingRecord = await prisma.billingHistory.create({
      data: {
        companyId,
        type: 'PLATFORM_FEE',
        amount,
        description: `اشتراك ${bundle.name} (من صفحة تعريفية)`,
        status: 'PENDING'
      }
    });

    const host = req.headers.host || 'maxp.online';
    const redirectUrl = `http://${host}/subscription?status=success&billingId=${billingRecord.id}`;
    const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
    const webhookUrl = `https://${baseDomain}/api/v1/public/platform-subscription/webhook`;

    const session = await KashierService.createPaymentSession({
      amount,
      currency: 'EGP',
      orderId: `messaging-${billingRecord.id}`,
      customer: { email, reference: phone || companyId },
      redirectUrl,
      webhookUrl,
      description: `${bundle.name} - دفع الاشتراك`,
    }, null);

    if (!session.success) {
      await prisma.billingHistory.update({
        where: { id: billingRecord.id },
        data: { status: 'FAILED', description: `فشل إنشاء جلسة الدفع: ${session.error}` }
      });
      return res.status(502).json({ success: false, message: 'فشل إنشاء جلسة الدفع' });
    }

    await prisma.billingHistory.update({
      where: { id: billingRecord.id },
      data: { referenceId: session.sessionId }
    });

    res.json({ success: true, data: { sessionUrl: session.sessionUrl, billingId: billingRecord.id } });
  } catch (error) {
    console.error('[LP-CHECKOUT] Error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء إنشاء عملية الدفع' });
  }
};

/**
 * @route POST /api/v1/public/platform-subscription/webhook
 * @desc Public webhook from Kashier to process merchant subscription payments
 * @access Public
 */
exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log("[KASHIER-PLATFORM-WEBHOOK] Received payload:", JSON.stringify(payload));

    const orderId = payload.merchantOrderId || payload.orderId || payload.data?.merchantOrderId;
    const status = payload.status || payload.data?.status;
    const sessionId = payload._id || payload.sessionId || payload.data?.sessionId;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: "Invalid payload parameters" });
    }

    // Extract billing history ID from merchantOrderId (formatted as platform-sub-xxxx or messaging-xxxx)
    if (!orderId.startsWith("platform-sub-") && !orderId.startsWith("messaging-")) {
      return res.status(200).json({ success: true, message: "Ignored (non-platform order)" });
    }

    const isMessaging = orderId.startsWith("messaging-");
    const billingId = isMessaging ? orderId.replace("messaging-", "") : orderId.replace("platform-sub-", "");
    const prisma = getSharedPrismaClient();

    const billingRecord = await prisma.billingHistory.findUnique({
      where: { id: billingId },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    });

    if (!billingRecord) {
      console.warn(`[KASHIER-PLATFORM-WEBHOOK] Billing record not found for ID: ${billingId}`);
      return res.status(200).json({ success: true, message: "Billing record not found" });
    }

    if (billingRecord.status === "SUCCESS") {
      return res.json({ success: true, message: "Already processed successfully" });
    }

    const paymentSuccessful = status === "CAPTURED" || status === "SUCCESS";
    const newStatus = paymentSuccessful ? "SUCCESS" : "FAILED";

    if (paymentSuccessful) {
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      await prisma.$transaction(async (tx) => {
        await tx.billingHistory.update({
          where: { id: billingId },
          data: {
            status: "SUCCESS",
            description: `تم سداد الاشتراك بنجاح عبر كاشير (تلقائي)`,
            referenceId: sessionId || billingRecord.referenceId
          }
        });

        await tx.platformSubscription.upsert({
          where: { companyId: billingRecord.companyId },
          update: {
            status: "ACTIVE",
            nextBillingDate,
            failedAttempts: 0,
            lastBillingDate: new Date()
          },
          create: {
            companyId: billingRecord.companyId,
            status: "ACTIVE",
            nextBillingDate,
            billingDay: new Date().getDate(),
            failedAttempts: 0,
            lastBillingDate: new Date(),
            monthlyFee: billingRecord.amount
          }
        });

        if (isMessaging) {
          const messagingApps = await tx.marketplaceApp.findMany({
            where: { slug: { in: ['crm-basic', 'whatsapp-business', 'telegram-business'] } },
            select: { id: true, slug: true }
          });
          for (const app of messagingApps) {
            await tx.companyApp.upsert({
              where: { companyId_appId: { companyId: billingRecord.companyId, appId: app.id } },
              update: { status: 'ACTIVE' },
              create: { companyId: billingRecord.companyId, appId: app.id, status: 'ACTIVE' }
            });
          }
        }
      });

      console.log(`✅ [BILLING-WEBHOOK] Subscription activated for company ${billingRecord.companyId}`);

      // Async distribution of commissions
      const platformPartnerService = require("../services/platformPartner.service");
      platformPartnerService.distributeCommissions(billingId).catch((err) => {
        console.error("❌ [BILLING-WEBHOOK] Partner commission failed:", err);
      });

      // Async WhatsApp notification
      WhatsAppNotificationService.sendSubscriptionRenewedNotification({
        companyId: billingRecord.companyId,
        planName: isMessaging ? "MESSAGING" : "PLATFORM",
        monthlyFee: Number(billingRecord.amount),
        currency: "EGP",
        billingCycle: "monthly",
        nextBillingDate
      }).catch((err) => {
        console.error("❌ [BILLING-WEBHOOK] Notification failed:", err);
      });

    } else {
      await prisma.billingHistory.update({
        where: { id: billingId },
        data: {
          status: "FAILED",
          description: `فشل الدفع عبر كاشير - حالة العملية: ${status}`
        }
      });
      console.warn(`⚠️ [BILLING-WEBHOOK] Payment failed for transaction ${billingId}`);
    }

    res.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("[BILLING-WEBHOOK] Webhook error:", error);
    res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
};
