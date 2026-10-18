const express = require("express");
const fs = require("fs");
const router = express.Router();
const affiliateService = require("../services/affiliateService");
const commissionService = require("../services/commissionService");
const dropshippingService = require("../services/dropshippingService");
const internalSyncService = require("../services/internalSyncService");
const verifyToken = require("../utils/verifyToken");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const companyConnectionController = require("../controller/companyConnectionController");
const {
  getWooCommerceAutoExportService,
} = require("../services/wooCommerceAutoExportService");
const { cacheMiddleware } = require("../middleware/performanceOptimization");
const { ensureWithinPlanLimit } = require("../utils/planLimitPayloads");
const uploadAffiliatePayoutProof = require("../middleware/affiliatePayoutProofUpload");
const uploadAffiliateIdentityDocument = require("../middleware/affiliateIdentityDocumentUpload");
const { isProductVisibleToAffiliate } = require("../utils/affiliateProductVisibility");

const canManageAffiliates = (userRole) =>
  ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "ADMIN"].includes(userRole);

const canViewAffiliates = (user) => {
  if (!user) return false;
  if (user.scope === 'ai-bridge' || user.role === 'SERVICE' || user.role === 'AGENT') return true;
  return ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "ADMIN"].includes(user.role);
};

const VALID_AFFILIATE_STATUSES = new Set(["PENDING", "ACTIVE", "SUSPENDED"]);
const VALID_DOCUMENT_REVIEW_STATUSES = new Set([
  "NOT_SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
]);

const normalizeRequestedStatus = ({ status, isActive }) => {
  if (typeof status === "string") {
    const normalized = status.toUpperCase();
    if (!VALID_AFFILIATE_STATUSES.has(normalized)) {
      return { error: "حالة المسوق غير صالحة" };
    }
    return { value: normalized };
  }

  if (typeof isActive === "boolean") {
    return { value: isActive ? "ACTIVE" : "SUSPENDED" };
  }

  return { error: "يجب تحديد حالة المسوق" };
};

const parsePositiveAmount = (value, fieldLabel) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} غير صالح` };
  }
  return { value: parsed };
};

const ensureManagedAffiliatePayoutAccess = async (req, res, next) => {
  try {
    if (!canManageAffiliates(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لإدارة طلبات السحب",
      });
    }

    const prisma = getSharedPrismaClient();
    const managedPayout = await prisma.affiliatePayout.findFirst({
      where: {
        id: req.params.id,
        affiliate: {
          companyId: req.user.companyId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!managedPayout) {
      return res.status(404).json({
        success: false,
        message: "عملية السحب غير موجودة",
      });
    }

    req.managedAffiliatePayout = managedPayout;
    next();
  } catch (error) {
    console.error(
      "❌ [AFFILIATE-ROUTES] Error validating managed affiliate payout:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من طلب السحب",
    });
  }
};

const ensureAffiliatePayoutCanAcceptProof = (req, res, next) => {
  const payoutStatus = req.managedAffiliatePayout?.status;
  if (!["PROCESSED", "PAID"].includes(payoutStatus)) {
    return res.status(400).json({
      success: false,
      message: "يمكن رفع إثبات التحويل بعد تسجيل الدفعة فقط",
    });
  }

  next();
};

const handleAffiliatePayoutProofUpload = (req, res, next) => {
  uploadAffiliatePayoutProof.single("proof")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "فشل رفع إثبات التحويل",
      });
    }

    next();
  });
};

const handleAffiliateIdentityDocumentUpload = (req, res, next) => {
  uploadAffiliateIdentityDocument.single("identityDocument")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "فشل رفع مستند الاعتماد",
      });
    }

    next();
  });
};

const buildAffiliateDefaults = async (prisma, companyId) => {
  if (!companyId) {
    return {
      commissionType: "PERCENTAGE",
      commissionRate: 5,
      minPayout: 100,
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      status: "PENDING",
    };
  }

  const settings = await prisma.affiliateSetting.findUnique({
    where: { companyId },
  });

  return {
    commissionType: settings?.commissionType || "PERCENTAGE",
    commissionRate: Number.isFinite(Number(settings?.commissionRate))
      ? Number(settings.commissionRate)
      : 5,
    minPayout: Number.isFinite(Number(settings?.defaultMinPayout))
      ? Number(settings.defaultMinPayout)
      : 100,
    canCreateOrdersForOthers:
      settings?.defaultCanCreateOrdersForOthers ?? true,
    canViewCustomerData: settings?.defaultCanViewCustomerData ?? true,
    status: settings?.autoApproveAffiliates ? "ACTIVE" : "PENDING",
  };
};

const createAffiliatePayoutRequestHandler =
  (successMessage = "تم إنشاء طلب السحب بنجاح") =>
  async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      let affiliate = req.affiliate;

      if (!affiliate) {
        affiliate = await prisma.affiliate.findUnique({
          where: { userId: req.user.id },
        });
      }

      if (!affiliate && req.user.affiliateId) {
        affiliate = await prisma.affiliate.findFirst({
          where: {
            id: req.user.affiliateId,
            userId: req.user.id,
          },
        });
      }

      if (!affiliate) {
        return res
          .status(404)
          .json({ success: false, message: "حساب المسوق غير موجود" });
      }

      if (affiliate.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "لا يمكن طلب سحب قبل تفعيل حساب المسوق",
        });
      }

      const { amount, paymentMethod, paymentDetails } = req.body;
      const requestedAmount = Number(amount);

      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "مبلغ السحب غير صالح",
        });
      }

      if (requestedAmount < Number(affiliate.minPayout || 0)) {
        return res.status(400).json({
          success: false,
          message: `الحد الأدنى للسحب هو ${affiliate.minPayout} جنيه`,
        });
      }

      const payoutMethod = paymentMethod || affiliate.paymentMethod;
      if (!payoutMethod) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد طريقة الدفع",
        });
      }

      const payout = await commissionService.processPayout(
        affiliate.id,
        requestedAmount,
        {
          method: payoutMethod,
          details: paymentDetails,
        },
      );

      res.json({
        success: true,
        message: successMessage,
        data: payout,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error requesting payout:", error);
      res.status(400).json({
        success: false,
        message: error.message || "فشل طلب السحب",
      });
    }
  };

/**
 * Middleware لضمان وجود سجل مسوق للمستخدم الحالي
 * يقوم بإنشاء السجل تلقائياً إذا كان المستخدم يمتلك رتبة AFFILIATE
 */
const ensureAffiliate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    let affiliate = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      // إذا كان المستخدم يستطيع الوصول إلى تجربة الأفليت، ننشئ السجل تلقائياً
      if (
        req.user.role === "AFFILIATE" ||
        req.user.role === "OWNER" ||
        req.user.role === "COMPANY_ADMIN" ||
        req.user.role === "SUPER_ADMIN"
      ) {
        try {
          console.log(
            `ℹ️ [AFFILIATE-AUTO] Creating missing affiliate record for user: ${userId}`,
          );
          affiliate = await affiliateService.registerAffiliate(userId, {
            companyId: companyId,
            status: "ACTIVE",
          });
        } catch (regError) {
          console.error(
            `⚠️ [AFFILIATE-AUTO] Failed to auto-register:`,
            regError.message,
          );
          // سنترك الخطأ يظهر كـ 404 لاحقاً إذا فشل التسجيل
        }
      }
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "المسوق غير موجود. يرجى التأكد من تسجيلك كمسوق أولاً.",
      });
    }

    // إضافة الكائن للطلب لاستخدامه في المسارات التالية
    req.affiliate = affiliate;
    next();
  } catch (error) {
    console.error("❌ [AFFILIATE-MIDDLEWARE] Error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطأ في التحقق من بيانات المسوق" });
  }
};

/**
 * تسجيل مسوق جديد
 */
router.post("/register", verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId || data.companyId || null;
    const defaults = await buildAffiliateDefaults(prisma, companyId);

    const affiliate = await affiliateService.registerAffiliate(userId, {
      companyId,
      commissionType: defaults.commissionType,
      commissionRate: defaults.commissionRate,
      minPayout: defaults.minPayout,
      canCreateOrdersForOthers: defaults.canCreateOrdersForOthers,
      canViewCustomerData: defaults.canViewCustomerData,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      status: defaults.status,
    });

    res.json({
      success: true,
      message: "تم تسجيل المسوق بنجاح",
      data: affiliate,
    });
  } catch (error) {
    console.error("❌ [AFFILIATE-ROUTES] Error registering affiliate:", error);
    res.status(400).json({
      success: false,
      message: error.message || "حدث خطأ أثناء تسجيل المسوق",
    });
  }
});

/**
 * بيانات المسوق الحالي
 */
router.get(
  "/me",
  verifyToken.authenticateToken,
  ensureAffiliate,
  cacheMiddleware(60000),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();

      const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              customDomain: true,
            },
          },
        },
      });

      const affiliateSettings = affiliate?.companyId
        ? await prisma.affiliateSetting.findUnique({
            where: { companyId: affiliate.companyId },
            select: { payoutSlaDays: true },
          })
        : null;

      res.json({
        success: true,
        data: affiliate
          ? {
              ...affiliate,
              payoutSlaDays: affiliateSettings?.payoutSlaDays ?? 3,
            }
          : affiliate,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting affiliate:", error);
      if (error.payload && error.statusCode) {
        return res.status(error.statusCode).json(error.payload);
      }

      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب بيانات المسوق",
      });
    }
  },
);

/**
 * تحديث بيانات المسوق
 */
router.put(
  "/me",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const updateData = { ...req.body };
      if (updateData.paymentMethod) {
        updateData.paymentMethod = affiliateService.normalizePaymentMethod(
          updateData.paymentMethod,
        );
      }
      if (updateData.paymentDetails) {
        updateData.paymentDetails = JSON.stringify(updateData.paymentDetails);
      }

      const updated = await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: updateData,
      });

      res.json({
        success: true,
        message: "تم تحديث البيانات بنجاح",
        data: updated,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error updating affiliate:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحديث البيانات",
      });
    }
  },
);

/**
 * إحصائيات المسوق
 */
router.get(
  "/stats",
  verifyToken.authenticateToken,
  ensureAffiliate,
  cacheMiddleware(60000),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();

      const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
        select: {
          id: true,
          totalEarnings: true,
          paidEarnings: true,
          pendingEarnings: true,
          totalSales: true,
          totalClicks: true,
          conversionRate: true,
        },
      });

      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "المسوق غير موجود. يرجى التأكد من تسجيلك كمسوق أولاً.",
        });
      }

      const [ordersCount, commissionsCount] = await Promise.all([
        prisma.order.count({ where: { affiliateId: affiliate.id } }),
        prisma.commission.count({ where: { affiliateId: affiliate.id } }),
      ]);

      const stats = {
        totalEarnings: Number(affiliate.totalEarnings),
        paidEarnings: Number(affiliate.paidEarnings),
        pendingEarnings: Number(affiliate.pendingEarnings),
        totalSales: affiliate.totalSales,
        totalClicks: affiliate.totalClicks,
        conversionRate: affiliate.conversionRate,
        totalOrders: ordersCount,
        totalCommissions: commissionsCount,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting stats:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب الإحصائيات",
      });
    }
  },
);

/**
 * قائمة العمولات
 */
router.get(
  "/commissions",
  verifyToken.authenticateToken,
  ensureAffiliate,
  cacheMiddleware(30000),
  async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const take = Math.min(parseInt(limit, 10) || 50, 200);
      const skip = Math.max(parseInt(offset, 10) || 0, 0);

      const where = {
        affiliateId: affiliate.id,
        ...(status ? { status } : {}),
      };

      const [commissions, total] = await Promise.all([
        prisma.commission.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take,
          skip,
        }),
        prisma.commission.count({ where }),
      ]);

      res.json({
        success: true,
        data: commissions,
        meta: {
          total,
          limit: take,
          offset: skip,
        },
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting commissions:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب العمولات",
      });
    }
  },
);

/**
 * طلب سحب
 */
router.post(
  "/payout-request",
  verifyToken.authenticateToken,
  ensureAffiliate,
  createAffiliatePayoutRequestHandler("تم إنشاء طلب السحب بنجاح"),
);

/**
 * قائمة الإحالات
 */
router.get(
  "/referrals",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const referrals = await prisma.affiliateReferral.findMany({
        where: {
          affiliateId: affiliate.id,
        },
        include: {
          ...(affiliate.canViewCustomerData
            ? {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              }
            : {}),
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: referrals,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting referrals:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب الإحالات",
      });
    }
  },
);

/**
 * منتجات المسوق (للطريقة الثانية)
 */
router.get(
  "/products",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const products = await prisma.affiliateProduct.findMany({
        where: {
          affiliateId: affiliate.id,
          isActive: true,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              description: true,
              metadata: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: products.filter((item) =>
          isProductVisibleToAffiliate(item.product, affiliate.id),
        ),
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting products:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب المنتجات",
      });
    }
  },
);

/**
 * إضافة منتج مع هامش ربح
 */
router.post(
  "/products",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId, markup } = req.body;

      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const affiliateProduct = await affiliateService.createAffiliateProduct(
        affiliate.id,
        productId,
        markup,
      );

      res.json({
        success: true,
        message: "تم إضافة المنتج بنجاح",
        data: affiliateProduct,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error adding product:", error);
      res.status(400).json({
        success: false,
        message: error.message || "حدث خطأ أثناء إضافة المنتج",
      });
    }
  },
);

/**
 * تحديث هامش ربح منتج
 */
router.put(
  "/products/:id",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { markup } = req.body;

      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const affiliateProduct = await prisma.affiliateProduct.findUnique({
        where: { id },
      });

      if (!affiliateProduct || affiliateProduct.affiliateId !== affiliate.id) {
        return res.status(404).json({
          success: false,
          message: "المنتج غير موجود",
        });
      }

      const parsedMarkup = Number(markup);
      if (!Number.isFinite(parsedMarkup) || parsedMarkup < 0) {
        return res.status(400).json({
          success: false,
          message: "هامش الربح غير صالح",
        });
      }

      const finalPrice = Number(affiliateProduct.basePrice) + parsedMarkup;

      const updated = await prisma.affiliateProduct.update({
        where: { id },
        data: {
          markup: parsedMarkup,
          finalPrice,
        },
      });

      res.json({
        success: true,
        message: "تم تحديث الهامش بنجاح",
        data: updated,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error updating product:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحديث المنتج",
      });
    }
  },
);

/**
 * إزالة منتج من كتالوج المسوق
 */
router.delete(
  "/products/:id",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const affiliateProduct = await prisma.affiliateProduct.findUnique({
        where: { id },
      });

      if (!affiliateProduct || affiliateProduct.affiliateId !== affiliate.id) {
        return res.status(404).json({
          success: false,
          message: "المنتج غير موجود",
        });
      }

      const updated = await prisma.affiliateProduct.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "تم إزالة المنتج من كتالوجك",
        data: updated,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error removing product:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء إزالة المنتج",
      });
    }
  },
);

/**
 * الحصول على سعر المنتج للمسوق
 */
router.get(
  "/products/:productId/price",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const priceInfo = await affiliateService.getAffiliateProductPrice(
        affiliate.id,
        productId,
      );

      res.json({
        success: true,
        data: priceInfo,
      });
    } catch (error) {
      console.error(
        "❌ [AFFILIATE-ROUTES] Error getting product price:",
        error,
      );
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب السعر",
      });
    }
  },
);

/**
 * قائمة طلبات المسوق
 */
router.get(
  "/orders",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, orderSource, limit = 50, offset = 0 } = req.query;

      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      const orders = await affiliateService.getAffiliateOrders(affiliate.id, {
        status,
        orderSource,
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeCustomerData: Boolean(affiliate.canViewCustomerData),
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting orders:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب الطلبات",
      });
    }
  },
);

/**
 * قائمة العملاء المرتبطين بالمسوق
 */
/**
 * تفاصيل طلب مسوق واحد
 */
router.get(
  "/orders/:id",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const affiliate = req.affiliate;

      const order = await affiliateService.getAffiliateOrderById(
        affiliate.id,
        req.params.id,
        {
          includeCustomerData: Boolean(affiliate.canViewCustomerData),
        },
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "الطلب غير موجود أو غير مرتبط بهذا المسوق",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting order details:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب تفاصيل الطلب",
      });
    }
  },
);

/**
 * تذاكر الدعم المرتبطة بطلب المسوق.
 */
router.get(
  "/orders/:id/tickets",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const tickets = await affiliateService.getAffiliateOrderTickets(
        req.affiliate.id,
        req.params.id,
      );

      if (!tickets) {
        return res.status(404).json({
          success: false,
          message: "الطلب غير موجود أو غير مرتبط بهذا المسوق",
        });
      }

      res.json({
        success: true,
        data: tickets,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting order tickets:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب تذاكر الطلب",
      });
    }
  },
);

/**
 * إنشاء تيكت دعم على طلب مسوق وإضافته كملاحظة على الطلب.
 */
router.post(
  "/orders/:id/tickets",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const result = await affiliateService.createAffiliateOrderTicket(
        req.affiliate.id,
        req.user,
        req.params.id,
        req.body,
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "الطلب غير موجود أو غير مرتبط بهذا المسوق",
        });
      }

      res.status(201).json({
        success: true,
        message: "تم فتح التيكت وربطه بالطلب",
        data: result,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error creating order ticket:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode
          ? error.message
          : "حدث خطأ أثناء إنشاء تيكت الطلب",
      });
    }
  },
);

router.get(
  "/customers",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      if (!affiliate.canViewCustomerData) {
        return res.status(403).json({
          success: false,
          message: "غير مسموح لك بعرض بيانات العملاء",
        });
      }

      const customers = await affiliateService.getAffiliateCustomers(
        affiliate.id,
      );

      res.json({
        success: true,
        data: customers,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error getting customers:", error);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء جلب العملاء",
      });
    }
  },
);

/**
 * إنشاء طلب مباشر من المسوق
 */
router.post(
  "/orders",
  verifyToken.authenticateToken,
  ensureAffiliate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const prisma = getSharedPrismaClient();
      const affiliate = req.affiliate;

      if (affiliate.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "حساب المسوق غير نشط",
        });
      }

      if (!affiliate.canCreateOrdersForOthers) {
        return res.status(403).json({
          success: false,
          message: "هذا المسوق غير مسموح له بإنشاء طلبات مباشرة للعملاء",
        });
      }

      const { items, customerData, shippingAddress, paymentMethod, notes } =
        req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "يجب إضافة منتجات للطلب",
        });
      }

      // إنشاء أو البحث عن العميل
      let customerId = customerData?.customerId;
      if (customerData && !customerId) {
        const customer = await prisma.customer.upsert({
          where: {
            whatsappId_companyId: {
              whatsappId: customerData.phone,
              companyId: affiliate.companyId,
            },
          },
          update: {},
          create: {
            firstName: customerData.firstName || "عميل",
            lastName: customerData.lastName || "",
            phone: customerData.phone,
            whatsappId: customerData.phone,
            email: customerData.email,
            companyId: affiliate.companyId,
            status: "ACTIVE",
          },
        });
        customerId = customer.id;
      }

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد العميل",
        });
      }

      // حساب المجموع
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await prisma.product.findFirst({
          where: {
            id: item.productId,
            companyId: affiliate.companyId,
          },
          include: {
            merchantProducts: {
              where: {
                isActive: true,
                syncEnabled: true,
              },
              include: {
                merchant: true,
              },
              orderBy: [
                { merchantPrice: "asc" },
                { stock: "desc" },
                { createdAt: "asc" },
              ],
            },
          },
        });

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `المنتج ${item.productId} غير موجود`,
          });
        }

        // الحصول على السعر للمسوق
        const priceInfo = await affiliateService.getAffiliateProductPrice(
          affiliate.id,
          item.productId,
        );
        const price = priceInfo.price || product.price;
        const quantity = item.quantity || 1;
        const itemTotal = Number(price) * quantity;
        const basePrice = Number(
          priceInfo.basePrice || product.basePrice || product.price || price,
        );
        const merchantProduct = dropshippingService.selectBestMerchantProduct(
          product.merchantProducts || [],
          quantity,
        );
        const merchantPrice = merchantProduct
          ? Number(merchantProduct.merchantPrice)
          : basePrice;

        subtotal += itemTotal;

        orderItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          productName: product.name,
          productSku: product.sku,
          productImage: product.mainImage || product.images?.[0] || null,
          quantity,
          price: Number(price),
          total: itemTotal,
          basePrice,
          merchantPrice,
        });
      }

      const shipping = shippingAddress?.shippingCost || 0;
      const total = subtotal + shipping;

      // إنشاء رقم الطلب
      const orderService = require("../services/orderService");
      const orderNumber = await orderService.generateOrderNumber(
        affiliate.companyId,
      );

      const orderLimitCheck = await ensureWithinPlanLimit(
        affiliate.companyId,
        "orders",
        1,
      );
      if (!orderLimitCheck.allowed) {
        return res.status(400).json(orderLimitCheck.payload);
      }

      // إنشاء الطلب
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId,
          companyId: affiliate.companyId,
          affiliateId: affiliate.id,
          orderSource: "AFFILIATE_DIRECT",
          subtotal,
          shipping,
          total,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: paymentMethod || "CASH",
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : null,
          notes: notes || `طلب مباشر من المسوق - ${affiliate.affiliateCode}`,
          sourceType: "affiliate_direct",
          orderItems: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              productSku: item.productSku,
              productImage: item.productImage,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              basePrice: item.basePrice,
              merchantPrice: item.merchantPrice,
            })),
          },
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // تُحتسب العمولات فوراً إذا كان إعداد الشركة يحدد PENDING
      try {
        const affSetting = await prisma.affiliateSetting.findUnique({
          where: { companyId: affiliate.companyId },
          select: { commissionOnStatus: true },
        });
        if (affSetting?.commissionOnStatus === 'PENDING') {
          const commissionService = require('../services/commissionService');
          await commissionService.calculateCommissions(order.id);
          console.log(`✅ [COMMISSION-PENDING] Calculated for order ${order.orderNumber}`);
        }
      } catch (calcErr) {
        console.error(`❌ [COMMISSION-PENDING] Failed for order ${order.orderNumber}:`, calcErr.message);
      }

      // 🚀 Push order to provider(s) if it contains imported products
      internalSyncService
        .pushOrderToProvider(order.id, affiliate.companyId)
        .catch((err) => {
          console.error(
            `❌ [INTERNAL-SYNC] Failed to push order ${order.id} to provider:`,
            err.message,
          );
        });

      // 🛒 Auto-export to WooCommerce
      try {
        const wooExportService = getWooCommerceAutoExportService();
        wooExportService.exportOrderAsync(order.id);
        console.log(
          `✅ [AFFILIATE-ORDER] WooCommerce auto-export queued for order: ${order.orderNumber}`,
        );
      } catch (wooError) {
        console.error(
          `❌ [AFFILIATE-ORDER] WooCommerce auto-export error:`,
          wooError.message,
        );
      }

      res.json({
        success: true,
        message: "تم إنشاء الطلب بنجاح",
        data: order,
      });
    } catch (error) {
      console.error("❌ [AFFILIATE-ROUTES] Error creating order:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء إنشاء الطلب",
      });
    }
  },
);

/**
 * تسجيل دفعة خارجية
 */
router.post(
  "/payouts/:id/record-external",
  verifyToken.authenticateToken,
  ensureManagedAffiliatePayoutAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { transactionId, externalReference, paymentDate } = req.body;

      const payout = await commissionService.recordExternalPayout(id, {
        transactionId,
        externalReference,
        paymentDate,
        processedBy: req.user.id,
      });

      res.json({
        success: true,
        message: "تم تسجيل الدفعة الخارجية بنجاح",
        data: payout,
      });
    } catch (error) {
      console.error(
        "❌ [AFFILIATE-ROUTES] Error recording external payout:",
        error,
      );
      res.status(400).json({
        success: false,
        message: error.message || "حدث خطأ أثناء تسجيل الدفعة",
      });
    }
  },
);

router.post(
  "/me/identity-document",
  verifyToken.authenticateToken,
  ensureAffiliate,
  handleAffiliateIdentityDocumentUpload,
  async (req, res) => {
    const uploadedDocumentPath = req.file?.path;

    try {
      if (!req.file?.filename) {
        return res.status(400).json({
          success: false,
          message: "يجب اختيار مستند اعتماد صالح للرفع",
        });
      }

      const updatedAffiliate = await affiliateService.replaceAffiliateIdentityDocument(
        req.affiliate.id,
        {
          fileUrl: `/uploads/affiliate-documents/${req.file.filename}`,
          uploadedAt: new Date(),
          uploadedByUserId: req.user.id,
        },
      );

      res.json({
        success: true,
        message: "تم رفع نسخة جديدة من مستند الاعتماد بنجاح",
        data: updatedAffiliate,
      });
    } catch (error) {
      if (uploadedDocumentPath) {
        await fs.promises.unlink(uploadedDocumentPath).catch(() => null);
      }

      const isValidationError = /غير صالح|لا يمكن|غير موجود/.test(
        error.message || "",
      );
      res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error.message || "فشل رفع النسخة الجديدة من مستند الاعتماد",
      });
    }
  },
);

/**
 * إلغاء طلب سحب مع إعادة العمولات المؤكدة إلى الرصيد المتاح
 */
router.post(
  "/payouts/:id/cancel",
  verifyToken.authenticateToken,
  ensureManagedAffiliatePayoutAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedReason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

      if (!normalizedReason) {
        return res.status(400).json({
          success: false,
          message: "يجب إدخال سبب إلغاء طلب السحب",
        });
      }

      const payout = await commissionService.cancelPayoutRequest(id, {
        reason: normalizedReason,
        processedBy: req.user.id,
      });

      res.json({
        success: true,
        message: "تم إلغاء طلب السحب بنجاح",
        data: payout,
      });
    } catch (error) {
      console.error(
        "❌ [AFFILIATE-ROUTES] Error cancelling affiliate payout request:",
        error,
      );
      res.status(400).json({
        success: false,
        message: error.message || "حدث خطأ أثناء إلغاء طلب السحب",
      });
    }
  },
);

router.post(
  "/payouts/:id/proof",
  verifyToken.authenticateToken,
  ensureManagedAffiliatePayoutAccess,
  ensureAffiliatePayoutCanAcceptProof,
  handleAffiliatePayoutProofUpload,
  async (req, res) => {
    const uploadedFilePath = req.file?.path;

    try {
      const { id } = req.params;
      if (!req.file?.filename) {
        return res.status(400).json({
          success: false,
          message: "يجب اختيار ملف لإثبات التحويل",
        });
      }

      const payout = await commissionService.attachPayoutProof(id, {
        proofFileUrl: `/uploads/affiliate-payouts/${req.file.filename}`,
      });

      res.json({
        success: true,
        message: "تم رفع إثبات التحويل بنجاح",
        data: payout,
      });
    } catch (error) {
      if (uploadedFilePath) {
        await fs.promises.unlink(uploadedFilePath).catch(() => null);
      }

      console.error(
        "❌ [AFFILIATE-ROUTES] Error uploading affiliate payout proof:",
        error,
      );
      res.status(400).json({
        success: false,
        message: error.message || "حدث خطأ أثناء رفع إثبات التحويل",
      });
    }
  },
);

router.get("/admin/payouts", verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageAffiliates(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const prisma = getSharedPrismaClient();
    const payouts = await prisma.affiliatePayout.findMany({
      where: {
        affiliate: {
          companyId: req.user.companyId,
        },
      },
      include: {
        affiliate: {
          select: {
            id: true,
            affiliateCode: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            status: true,
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: payouts });
  } catch (error) {
    console.error("❌ [AFFILIATE-ROUTES] Error listing admin payouts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "حدث خطأ أثناء جلب طلبات السحب",
    });
  }
});

/**
 * قائمة المسوقين (للإدارة)
 */
router.get("/", verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === "SUPER_ADMIN"
      ? (req.query.companyId || req.user.companyId)
      : req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "معرف الشركة مطلوب" });
    }

    if (!canViewAffiliates(req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const affiliates = await affiliateService.listAffiliates(companyId);
    res.json({ success: true, data: affiliates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/list", verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === "SUPER_ADMIN"
      ? (req.query.companyId || req.user.companyId)
      : req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "معرف الشركة مطلوب" });
    }

    if (!canViewAffiliates(req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const affiliates = await affiliateService.listAffiliates(companyId);
    res.json({ success: true, data: affiliates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id/profile", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!canManageAffiliates(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "المسوق غير موجود",
      });
    }

    const [
      orderStats,
      deliveredOrders,
      cancelledOrders,
      orders,
      commissionStats,
      commissions,
      payoutStats,
      payouts,
      referrals,
      reviewHistory,
      documentHistory,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { affiliateId: id, companyId },
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { affiliateId: id, companyId, status: "DELIVERED" },
      }),
      prisma.order.count({
        where: {
          affiliateId: id,
          companyId,
          status: { in: ["CANCELLED", "DUPLICATE_ORDER"] },
        },
      }),
      prisma.order.findMany({
        where: { affiliateId: id, companyId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          currency: true,
          customerName: true,
          customerPhone: true,
          sourceType: true,
          orderSource: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.commission.groupBy({
        by: ["status"],
        where: { affiliateId: id, companyId },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.commission.findMany({
        where: { affiliateId: id, companyId },
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          calculationType: true,
          rate: true,
          orderTotal: true,
          payoutId: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.affiliatePayout.groupBy({
        by: ["status"],
        where: { affiliateId: id },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.affiliatePayout.findMany({
        where: { affiliateId: id },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paymentDetails: true,
          transactionId: true,
          externalReference: true,
          proofFileUrl: true,
          processedAt: true,
          createdAt: true,
          notes: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.affiliateReferral.findMany({
        where: { affiliateId: id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      affiliateService.getAffiliateReviewHistory(id, { limit: 20 }),
      affiliateService.getAffiliateDocumentHistory(id, { limit: 20 }),
    ]);

    const sumGroupedAmount = (rows, statuses) =>
      rows
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + Number(row._sum.amount || 0), 0);
    const countGroupedRows = (rows, statuses) =>
      rows
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + Number(row._count.id || 0), 0);

    res.json({
      success: true,
      data: {
        affiliate,
        stats: {
          ordersCount: Number(orderStats._count.id || 0),
          deliveredOrders,
          cancelledOrders,
          totalOrderValue: Number(orderStats._sum.total || 0),
          commissionsCount: countGroupedRows(commissionStats, [
            "PENDING",
            "CONFIRMED",
            "PAID",
            "CANCELLED",
          ]),
          confirmedCommissionAmount: sumGroupedAmount(commissionStats, [
            "CONFIRMED",
          ]),
          pendingCommissionAmount: sumGroupedAmount(commissionStats, ["PENDING"]),
          paidCommissionAmount: sumGroupedAmount(commissionStats, ["PAID"]),
          cancelledCommissionAmount: sumGroupedAmount(commissionStats, [
            "CANCELLED",
          ]),
          payoutRequestsCount: payoutStats.reduce(
            (total, row) => total + Number(row._count.id || 0),
            0,
          ),
          pendingPayoutAmount: sumGroupedAmount(payoutStats, ["PENDING"]),
          processedPayoutAmount: sumGroupedAmount(payoutStats, [
            "PROCESSED",
            "PAID",
          ]),
        },
        orders,
        commissions,
        payouts,
        referrals,
        reviewHistory,
        documentHistory,
      },
    });
  } catch (error) {
    console.error("❌ [AFFILIATE-ROUTES] Error getting affiliate profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "حدث خطأ أثناء جلب ملف المسوق",
    });
  }
});

/**
 * تحديث حالة المسوق
 */
router.put("/:id/status", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, status, statusReason } = req.body;
    if (!canManageAffiliates(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const prisma = getSharedPrismaClient();
    const managedAffiliate = await prisma.affiliate.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
      select: { id: true },
    });

    if (!managedAffiliate) {
      return res.status(404).json({
        success: false,
        message: "المسوق غير موجود",
      });
    }

    const normalizedStatus = normalizeRequestedStatus({ status, isActive });
    if (normalizedStatus.error) {
      return res.status(400).json({
        success: false,
        message: normalizedStatus.error,
      });
    }

    const normalizedReason =
      typeof statusReason === "string" ? statusReason.trim() : "";
    if (normalizedStatus.value === "SUSPENDED" && !normalizedReason) {
      return res.status(400).json({
        success: false,
        message: "يجب إدخال سبب إيقاف أو رفض المسوق",
      });
    }

    await affiliateService.updateAffiliateStatus(id, normalizedStatus.value, {
      statusReason:
        typeof statusReason === "string" ? statusReason : undefined,
      reviewedBy: req.user.id,
    });
    res.json({ success: true, message: "تم تحديث الحالة بنجاح" });
  } catch (error) {
    const isValidationError = /غير صالح|يجب/.test(error.message || "");
    res
      .status(isValidationError ? 400 : 500)
      .json({ success: false, message: error.message });
  }
});

router.put(
  "/:id/document-review",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNote } = req.body;

      if (!canManageAffiliates(req.user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "ليس لديك صلاحية" });
      }

      const prisma = getSharedPrismaClient();
      const managedAffiliate = await prisma.affiliate.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        select: { id: true },
      });

      if (!managedAffiliate) {
        return res.status(404).json({
          success: false,
          message: "المسوق غير موجود",
        });
      }

      const normalizedStatus = String(status || "")
        .trim()
        .toUpperCase();
      if (!VALID_DOCUMENT_REVIEW_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "حالة مستند الاعتماد غير صالحة",
        });
      }

      const normalizedReviewNote =
        typeof reviewNote === "string" ? reviewNote.trim() : "";
      if (normalizedStatus === "REJECTED" && !normalizedReviewNote) {
        return res.status(400).json({
          success: false,
          message: "يجب إدخال سبب رفض مستند الاعتماد",
        });
      }

      const updatedAffiliate = await affiliateService.updateAffiliateDocumentReview(
        id,
        {
          status: normalizedStatus,
          reviewNote:
            typeof reviewNote === "string" ? reviewNote : undefined,
          reviewedBy: req.user.id,
        },
      );

      res.json({
        success: true,
        message: "تم تحديث حالة مستند الاعتماد بنجاح",
        data: updatedAffiliate,
      });
    } catch (error) {
      const isValidationError = /غير صالح|يجب|لا يوجد/.test(error.message || "");
      res
        .status(isValidationError ? 400 : 500)
        .json({ success: false, message: error.message });
    }
  },
);

router.get(
  "/:id/review-history",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!canManageAffiliates(req.user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "ليس لديك صلاحية" });
      }

      const prisma = getSharedPrismaClient();
      const managedAffiliate = await prisma.affiliate.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        select: { id: true },
      });

      if (!managedAffiliate) {
        return res.status(404).json({
          success: false,
          message: "المسوق غير موجود",
        });
      }

      const reviewHistory = await affiliateService.getAffiliateReviewHistory(id, {
        limit: req.query.limit,
      });

      res.json({
        success: true,
        data: reviewHistory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "فشل تحميل سجل مراجعات المسوق",
      });
    }
  },
);

router.get(
  "/:id/document-history",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!canManageAffiliates(req.user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "ليس لديك صلاحية" });
      }

      const prisma = getSharedPrismaClient();
      const managedAffiliate = await prisma.affiliate.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        select: { id: true },
      });

      if (!managedAffiliate) {
        return res.status(404).json({
          success: false,
          message: "المسوق غير موجود",
        });
      }

      const documentHistory = await affiliateService.getAffiliateDocumentHistory(
        id,
        {
          limit: req.query.limit,
        },
      );

      res.json({
        success: true,
        data: documentHistory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "فشل تحميل نسخ مستند الاعتماد",
      });
    }
  },
);

/**
 * تحديث عمولة المسوق
 */
router.put(
  "/:id/commission",
  verifyToken.authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { commissionRate, commissionType } = req.body;
      if (!canManageAffiliates(req.user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "ليس لديك صلاحية" });
      }

      const prisma = getSharedPrismaClient();
      const managedAffiliate = await prisma.affiliate.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        select: { id: true, commissionType: true },
      });

      if (!managedAffiliate) {
        return res.status(404).json({
          success: false,
          message: "المسوق غير موجود",
        });
      }

      const finalType = commissionType || managedAffiliate.commissionType;
      const VALID_COMMISSION_TYPES = ['PERCENTAGE', 'MARKUP', 'FIXED', 'FIXED_PER_ITEM'];
      if (commissionType && !VALID_COMMISSION_TYPES.includes(commissionType)) {
        return res.status(400).json({
          success: false,
          message: "نوع العمولة غير صالح",
        });
      }

      const parsedCommission = parsePositiveAmount(commissionRate, "قيمة العمولة");
      if (parsedCommission.error) {
        return res.status(400).json({
          success: false,
          message: parsedCommission.error,
        });
      }

      if (
        finalType === "PERCENTAGE" &&
        parsedCommission.value > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "نسبة العمولة لا يمكن أن تتجاوز 100%",
        });
      }

      if (
        finalType === "MARKUP" &&
        parsedCommission.value > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message: "قيمة هامش الربح أكبر من الحد المسموح",
        });
      }

      await affiliateService.updateAffiliateCommission(id, parsedCommission.value, commissionType);
      res.json({ success: true, message: "تم تحديث العمولة بنجاح" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.put("/:id/policy", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManageAffiliates(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "ليس لديك صلاحية" });
    }

    const prisma = getSharedPrismaClient();
    const managedAffiliate = await prisma.affiliate.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
      select: { id: true },
    });

    if (!managedAffiliate) {
      return res.status(404).json({
        success: false,
        message: "المسوق غير موجود",
      });
    }

    const { minPayout, canCreateOrdersForOthers, canViewCustomerData } =
      req.body;
    if (minPayout !== undefined) {
      const parsedMinPayout = Number(minPayout);
      if (
        !Number.isFinite(parsedMinPayout) ||
        parsedMinPayout <= 0 ||
        parsedMinPayout > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message: "الحد الأدنى للسحب غير صالح",
        });
      }
    }

    const updatedAffiliate = await affiliateService.updateAffiliatePolicy(id, {
      minPayout,
      canCreateOrdersForOthers,
      canViewCustomerData,
    });

    res.json({
      success: true,
      message: "تم تحديث ضوابط المسوق بنجاح",
      data: updatedAffiliate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "فشل تحديث ضوابط المسوق",
    });
  }
});

/**
 * طلب سحب الرصيد
 */
router.post(
  "/payout/request",
  verifyToken.authenticateToken,
  ensureAffiliate,
  createAffiliatePayoutRequestHandler("تم استلام طلب السحب بنجاح"),
);

/**
 * سجل عمليات السحب
 */
router.get("/payouts", verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();

    // Fetch affiliate ID if needed
    let targetAffiliateId = req.user.affiliateId;
    if (!targetAffiliateId) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id },
      });
      if (!affiliate) {
        return res
          .status(404)
          .json({ success: false, message: "حساب المسوق غير موجود" });
      }
      targetAffiliateId = affiliate.id;
    }

    const payouts = await prisma.affiliatePayout.findMany({
      where: { affiliateId: targetAffiliateId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error) {
    console.error("❌ [AFFILIATE-ROUTES] Error getting payouts:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب سجل السحوبات",
    });
  }
});

/**
 * جلب الطلبات المتاحة للاستيراد من شركة متصلة
 */
router.get(
  "/import/available-orders/:providerId",
  verifyToken.authenticateToken,
  companyConnectionController.fetchOrdersFromProvider,
);

/**
 * استيراد الطلبات المحددة من شركة متصلة
 */
router.post(
  "/import/orders/:providerId",
  verifyToken.authenticateToken,
  companyConnectionController.importInternalOrders,
);

module.exports = router;
