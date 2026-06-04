const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");
const platformSignupCouponService = require("../services/platformSignupCouponService");

const mapCouponRecord = (coupon) => {
  const serialized = platformSignupCouponService.serializeCoupon(coupon);
  const lastRedemption = Array.isArray(coupon?.redemptions)
    ? coupon.redemptions[0]
    : null;

  return {
    ...serialized,
    lastRedemption: lastRedemption
      ? {
          redeemedAt: lastRedemption.redeemedAt,
          email: lastRedemption.email || null,
          companyName: lastRedemption.company?.name || null,
        }
      : null,
  };
};

exports.listCoupons = async (req, res) => {
  try {
    const { search = "", state = "all" } = req.query;
    const trimmedSearch =
      typeof search === "string" ? search.trim() : "";

    const where = trimmedSearch
      ? {
          OR: [
            {
              code: {
                contains: trimmedSearch,
                mode: "insensitive",
              },
            },
            {
              name: {
                contains: trimmedSearch,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [coupons, summary] = await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();

      return Promise.all([
        prisma.platformSignupCoupon.findMany({
          where,
          include: {
            _count: {
              select: {
                redemptions: true,
              },
            },
            redemptions: {
              take: 1,
              orderBy: {
                redeemedAt: "desc",
              },
              select: {
                redeemedAt: true,
                email: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        }),
        platformSignupCouponService.getAdminCouponSummary(prisma),
      ]);
    });

    const items = coupons
      .map(mapCouponRecord)
      .filter((coupon) => state === "all" || coupon.state === state);

    res.json({
      success: true,
      data: {
        items,
        summary,
      },
    });
  } catch (error) {
    console.error("Error listing platform signup coupons:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب كوبونات التسجيل",
    });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const payload = platformSignupCouponService.sanitizeCouponInput(req.body);
    platformSignupCouponService.ensureCouponPayloadIsValid(payload);

    const created = await executeWithRetry(async () => {
      return getSharedPrismaClient().platformSignupCoupon.create({
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description || null,
          trialDays: payload.benefits.trialDays,
          bonusUsers: payload.benefits.bonusUsers,
          bonusProducts: payload.benefits.bonusProducts,
          bonusOrdersPerMonth: payload.benefits.bonusOrdersPerMonth,
          bonusCustomers: payload.benefits.bonusCustomers,
          usageLimit: payload.usageLimit,
          isActive: payload.isActive,
          validFrom: payload.validFrom,
          validTo: payload.validTo,
          createdBy: req.user?.email || req.user?.id || null,
        },
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
          redemptions: {
            take: 1,
            orderBy: {
              redeemedAt: "desc",
            },
            select: {
              redeemedAt: true,
              email: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء كوبون التسجيل بنجاح",
      data: mapCouponRecord(created),
    });
  } catch (error) {
    console.error("Error creating platform signup coupon:", error);
    const message =
      error?.code === "P2002"
        ? "كود الكوبون مستخدم بالفعل"
        : error.message || "فشل في إنشاء كوبون التسجيل";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const existing = await executeWithRetry(async () =>
      getSharedPrismaClient().platformSignupCoupon.findUnique({
        where: { id: couponId },
      }),
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "الكوبون غير موجود",
      });
    }

    const mergedPayload = {
      ...existing,
      ...req.body,
      validFrom: req.body?.validFrom ?? existing.validFrom,
      validTo: req.body?.validTo ?? existing.validTo,
    };
    const payload =
      platformSignupCouponService.sanitizeCouponInput(mergedPayload);
    platformSignupCouponService.ensureCouponPayloadIsValid(payload);

    const updated = await executeWithRetry(async () => {
      return getSharedPrismaClient().platformSignupCoupon.update({
        where: { id: couponId },
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description || null,
          trialDays: payload.benefits.trialDays,
          bonusUsers: payload.benefits.bonusUsers,
          bonusProducts: payload.benefits.bonusProducts,
          bonusOrdersPerMonth: payload.benefits.bonusOrdersPerMonth,
          bonusCustomers: payload.benefits.bonusCustomers,
          usageLimit: payload.usageLimit,
          isActive: payload.isActive,
          validFrom: payload.validFrom,
          validTo: payload.validTo,
        },
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
          redemptions: {
            take: 1,
            orderBy: {
              redeemedAt: "desc",
            },
            select: {
              redeemedAt: true,
              email: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    res.json({
      success: true,
      message: "تم تحديث كوبون التسجيل بنجاح",
      data: mapCouponRecord(updated),
    });
  } catch (error) {
    console.error("Error updating platform signup coupon:", error);
    const message =
      error?.code === "P2002"
        ? "كود الكوبون مستخدم بالفعل"
        : error.message || "فشل في تحديث كوبون التسجيل";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

exports.removeCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    const existing = await executeWithRetry(async () =>
      getSharedPrismaClient().platformSignupCoupon.findUnique({
        where: { id: couponId },
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
          redemptions: {
            take: 1,
            orderBy: {
              redeemedAt: "desc",
            },
            select: {
              redeemedAt: true,
              email: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "الكوبون غير موجود",
      });
    }

    const hasRedemptions =
      (existing._count?.redemptions ?? 0) > 0 || (existing.usageCount ?? 0) > 0;

    if (hasRedemptions) {
      const deactivated = await executeWithRetry(async () =>
        getSharedPrismaClient().platformSignupCoupon.update({
          where: { id: couponId },
          data: {
            isActive: false,
            validTo:
              existing.validTo && new Date(existing.validTo) < new Date()
                ? existing.validTo
                : new Date(),
          },
          include: {
            _count: {
              select: {
                redemptions: true,
              },
            },
            redemptions: {
              take: 1,
              orderBy: {
                redeemedAt: "desc",
              },
              select: {
                redeemedAt: true,
                email: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
      );

      return res.json({
        success: true,
        message: "تم إيقاف الكوبون لأنه مستخدم بالفعل، وتم الاحتفاظ بسجل الاسترداد",
        data: {
          action: "deactivated",
          coupon: mapCouponRecord(deactivated),
        },
      });
    }

    await executeWithRetry(async () =>
      getSharedPrismaClient().platformSignupCoupon.delete({
        where: { id: couponId },
      }),
    );

    res.json({
      success: true,
      message: "تم حذف كوبون التسجيل بنجاح",
      data: {
        action: "deleted",
        couponId,
      },
    });
  } catch (error) {
    console.error("Error removing platform signup coupon:", error);
    res.status(400).json({
      success: false,
      message: error.message || "فشل في حذف كوبون التسجيل",
    });
  }
};

exports.validatePublicCoupon = async (req, res) => {
  try {
    const couponCode = req.body?.promoCode || req.query?.promoCode;
    const result =
      await platformSignupCouponService.validateCouponForRegistration(
        couponCode,
      );

    res.json({
      success: true,
      message: "الكوبون صالح للاستخدام",
      data: {
        code: result.coupon.code,
        name: result.coupon.name,
        description: result.coupon.description,
        benefits: result.benefits,
        benefitSummary: result.coupon.benefitSummary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "الكوبون غير صالح",
    });
  }
};
