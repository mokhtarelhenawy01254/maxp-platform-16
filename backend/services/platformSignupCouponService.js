const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("./sharedDatabase");

const ZERO_BENEFITS = Object.freeze({
  trialDays: 0,
  bonusUsers: 0,
  bonusProducts: 0,
  bonusOrdersPerMonth: 0,
  bonusCustomers: 0,
});

const normalizeCouponCode = (value = "") =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const extractBenefits = (coupon) => ({
  trialDays: toPositiveInt(coupon?.trialDays),
  bonusUsers: toPositiveInt(coupon?.bonusUsers),
  bonusProducts: toPositiveInt(coupon?.bonusProducts),
  bonusOrdersPerMonth: toPositiveInt(coupon?.bonusOrdersPerMonth),
  bonusCustomers: toPositiveInt(coupon?.bonusCustomers),
});

const hasAnyBenefit = (benefits) =>
  Object.values(benefits || ZERO_BENEFITS).some((value) => value > 0);

const getCouponState = (coupon, now = new Date()) => {
  if (!coupon) return "missing";
  if (!coupon.isActive) return "inactive";
  if (coupon.validFrom && now < new Date(coupon.validFrom)) return "scheduled";
  if (coupon.validTo && now > new Date(coupon.validTo)) return "expired";
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return "depleted";
  }
  return "live";
};

const addLimitBonus = (baseLimit, bonus = 0) => {
  const normalizedBonus = toPositiveInt(bonus);
  if (baseLimit === undefined || baseLimit === null) {
    return normalizedBonus > 0 ? normalizedBonus : -1;
  }

  const numericBase = Number(baseLimit);
  if (!Number.isFinite(numericBase) || numericBase === -1) {
    return -1;
  }

  return numericBase + normalizedBonus;
};

const buildBenefitSummary = (benefits) => {
  const summary = [];

  if (benefits.trialDays > 0) {
    summary.push(`${benefits.trialDays} يوم إضافي مجانًا`);
  }
  if (benefits.bonusUsers > 0) {
    summary.push(`${benefits.bonusUsers} مستخدم إضافي`);
  }
  if (benefits.bonusProducts > 0) {
    summary.push(`${benefits.bonusProducts} منتج إضافي`);
  }
  if (benefits.bonusOrdersPerMonth > 0) {
    summary.push(`${benefits.bonusOrdersPerMonth} طلب إضافي شهريًا`);
  }
  if (benefits.bonusCustomers > 0) {
    summary.push(`${benefits.bonusCustomers} عميل إضافي`);
  }

  return summary;
};

const serializeCoupon = (coupon) => {
  if (!coupon) return null;

  const benefits = extractBenefits(coupon);

  return {
    id: coupon.id,
    code: normalizeCouponCode(coupon.code),
    name: coupon.name,
    description: coupon.description || "",
    trialDays: benefits.trialDays,
    bonusUsers: benefits.bonusUsers,
    bonusProducts: benefits.bonusProducts,
    bonusOrdersPerMonth: benefits.bonusOrdersPerMonth,
    bonusCustomers: benefits.bonusCustomers,
    usageLimit: coupon.usageLimit ?? null,
    usageCount: coupon.usageCount ?? 0,
    isActive: Boolean(coupon.isActive),
    validFrom: coupon.validFrom,
    validTo: coupon.validTo,
    createdBy: coupon.createdBy || null,
    createdAt: coupon.createdAt ?? null,
    updatedAt: coupon.updatedAt ?? null,
    redemptionsCount:
      coupon._count?.redemptions ??
      (Array.isArray(coupon.redemptions) ? coupon.redemptions.length : 0),
    benefitSummary: buildBenefitSummary(benefits),
    state: getCouponState(coupon),
  };
};

const sanitizeCouponInput = (payload = {}) => {
  const name =
    typeof payload.name === "string" ? payload.name.trim() : "";
  const code = normalizeCouponCode(payload.code);
  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : "";

  const validFrom = payload.validFrom ? new Date(payload.validFrom) : null;
  const validTo = payload.validTo ? new Date(payload.validTo) : null;

  const benefits = {
    trialDays: toPositiveInt(payload.trialDays),
    bonusUsers: toPositiveInt(payload.bonusUsers),
    bonusProducts: toPositiveInt(payload.bonusProducts),
    bonusOrdersPerMonth: toPositiveInt(payload.bonusOrdersPerMonth),
    bonusCustomers: toPositiveInt(payload.bonusCustomers),
  };

  const usageLimit =
    payload.usageLimit === null ||
    payload.usageLimit === undefined ||
    payload.usageLimit === ""
      ? null
      : toPositiveInt(payload.usageLimit);

  return {
    name,
    code,
    description,
    validFrom,
    validTo,
    usageLimit,
    isActive:
      typeof payload.isActive === "boolean" ? payload.isActive : true,
    benefits,
  };
};

const ensureCouponPayloadIsValid = (payload) => {
  if (!payload.name) {
    throw new Error("اسم الكوبون مطلوب");
  }

  if (!payload.code) {
    throw new Error("كود الكوبون مطلوب");
  }

  if (!(payload.validFrom instanceof Date) || Number.isNaN(payload.validFrom.getTime())) {
    throw new Error("تاريخ بداية الكوبون غير صالح");
  }

  if (!(payload.validTo instanceof Date) || Number.isNaN(payload.validTo.getTime())) {
    throw new Error("تاريخ نهاية الكوبون غير صالح");
  }

  if (payload.validTo <= payload.validFrom) {
    throw new Error("تاريخ نهاية الكوبون يجب أن يكون بعد تاريخ البداية");
  }

  if (!hasAnyBenefit(payload.benefits)) {
    throw new Error("يجب تحديد ميزة واحدة على الأقل للكوبون");
  }
};

const buildCompanyBonusSnapshot = (company) => ({
  trialDays: toPositiveInt(company?.signupTrialBonusDays),
  bonusUsers: toPositiveInt(company?.signupBonusUsers),
  bonusProducts: toPositiveInt(company?.signupBonusProducts),
  bonusOrdersPerMonth: toPositiveInt(company?.signupBonusOrdersPerMonth),
  bonusCustomers: toPositiveInt(company?.signupBonusCustomers),
});

const applyPlanLimitBonuses = (planLimit, company) => {
  const bonuses = buildCompanyBonusSnapshot(company);

  return {
    ...planLimit,
    maxEmployees: addLimitBonus(planLimit?.maxEmployees ?? -1, bonuses.bonusUsers),
    maxProducts: addLimitBonus(planLimit?.maxProducts ?? -1, bonuses.bonusProducts),
    maxOrdersPerMonth: addLimitBonus(
      planLimit?.maxOrdersPerMonth ?? -1,
      bonuses.bonusOrdersPerMonth,
    ),
    maxCustomers: addLimitBonus(
      planLimit?.maxCustomers ?? -1,
      bonuses.bonusCustomers,
    ),
  };
};

const applyServiceLimitBonuses = (limits, company) => {
  const bonuses = buildCompanyBonusSnapshot(company);

  return {
    ...limits,
    users: addLimitBonus(limits?.users ?? -1, bonuses.bonusUsers),
    customers: addLimitBonus(limits?.customers ?? -1, bonuses.bonusCustomers),
    products: addLimitBonus(limits?.products ?? -1, bonuses.bonusProducts),
    orders: addLimitBonus(
      limits?.orders ?? limits?.ordersPerMonth ?? -1,
      bonuses.bonusOrdersPerMonth,
    ),
  };
};

const getUsagePercentage = (current, limit) => {
  if (!Number.isFinite(limit) || limit <= 0 || limit === -1) {
    return 0;
  }

  return (current / limit) * 100;
};

const findCouponByCode = async (code, prisma = getSharedPrismaClient()) => {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return null;
  }

  return prisma.platformSignupCoupon.findUnique({
    where: { code: normalizedCode },
    include: {
      _count: {
        select: {
          redemptions: true,
        },
      },
    },
  });
};

const validateCouponForRegistration = async (code, prisma = getSharedPrismaClient()) => {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    throw new Error("كود الكوبون غير صالح");
  }

  const coupon = await findCouponByCode(normalizedCode, prisma);
  if (!coupon) {
    throw new Error("الكوبون غير موجود");
  }

  const benefits = extractBenefits(coupon);
  if (!hasAnyBenefit(benefits)) {
    throw new Error("الكوبون لا يحتوي على مزايا قابلة للتطبيق");
  }

  const state = getCouponState(coupon);
  if (state === "inactive") {
    throw new Error("الكوبون غير مفعل حاليًا");
  }
  if (state === "scheduled") {
    throw new Error("الكوبون لم يبدأ بعد");
  }
  if (state === "expired") {
    throw new Error("انتهت صلاحية الكوبون");
  }
  if (state === "depleted") {
    throw new Error("تم استهلاك الكوبون بالكامل");
  }

  return {
    coupon: serializeCoupon(coupon),
    normalizedCode,
    benefits,
  };
};

const applySignupCouponRedemption = async ({
  companyId,
  userId,
  email,
  couponCode,
  prisma = getSharedPrismaClient(),
}) => {
  const { coupon, normalizedCode, benefits } =
    await validateCouponForRegistration(couponCode, prisma);

  const existingRedemption =
    await prisma.platformSignupCouponRedemption.findUnique({
      where: { companyId },
    });

  if (existingRedemption) {
    throw new Error("تم استخدام كوبون تسجيل لهذه الشركة بالفعل");
  }

  await prisma.platformSignupCoupon.update({
    where: { id: coupon.id },
    data: {
      usageCount: {
        increment: 1,
      },
    },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      signupTrialBonusDays: {
        increment: benefits.trialDays,
      },
      signupBonusUsers: {
        increment: benefits.bonusUsers,
      },
      signupBonusProducts: {
        increment: benefits.bonusProducts,
      },
      signupBonusOrdersPerMonth: {
        increment: benefits.bonusOrdersPerMonth,
      },
      signupBonusCustomers: {
        increment: benefits.bonusCustomers,
      },
      signupCouponCode: normalizedCode,
      signupCouponRedeemedAt: new Date(),
    },
  });

  const redemption = await prisma.platformSignupCouponRedemption.create({
    data: {
      couponId: coupon.id,
      companyId,
      userId: userId || null,
      email: email || null,
      appliedCode: normalizedCode,
      trialDaysGranted: benefits.trialDays,
      bonusUsersGranted: benefits.bonusUsers,
      bonusProductsGranted: benefits.bonusProducts,
      bonusOrdersGranted: benefits.bonusOrdersPerMonth,
      bonusCustomersGranted: benefits.bonusCustomers,
    },
  });

  return {
    coupon,
    benefits,
    redemption,
  };
};

const getAdminCouponSummary = async (prisma = getSharedPrismaClient()) => {
  const coupons = await prisma.platformSignupCoupon.findMany({
    include: {
      _count: {
        select: {
          redemptions: true,
        },
      },
    },
  });

  const summary = {
    totalCoupons: coupons.length,
    liveCoupons: 0,
    scheduledCoupons: 0,
    expiredCoupons: 0,
    inactiveCoupons: 0,
    depletedCoupons: 0,
    totalRedemptions: 0,
  };

  for (const coupon of coupons) {
    const state = getCouponState(coupon);
    summary.totalRedemptions += coupon._count?.redemptions ?? 0;

    if (state === "live") summary.liveCoupons += 1;
    if (state === "scheduled") summary.scheduledCoupons += 1;
    if (state === "expired") summary.expiredCoupons += 1;
    if (state === "inactive") summary.inactiveCoupons += 1;
    if (state === "depleted") summary.depletedCoupons += 1;
  }

  return summary;
};

module.exports = {
  ZERO_BENEFITS,
  normalizeCouponCode,
  extractBenefits,
  buildBenefitSummary,
  serializeCoupon,
  sanitizeCouponInput,
  ensureCouponPayloadIsValid,
  getCouponState,
  getUsagePercentage,
  findCouponByCode,
  validateCouponForRegistration,
  applySignupCouponRedemption,
  getAdminCouponSummary,
  buildCompanyBonusSnapshot,
  applyPlanLimitBonuses,
  applyServiceLimitBonuses,
  addLimitBonus,
};
