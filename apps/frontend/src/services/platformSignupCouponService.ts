import { apiClient } from "./apiClient";

export interface PlatformSignupCouponBenefits {
  trialDays: number;
  bonusUsers: number;
  bonusProducts: number;
  bonusOrdersPerMonth: number;
  bonusCustomers: number;
}

export interface PlatformSignupCoupon {
  id: string;
  code: string;
  name: string;
  description: string;
  trialDays: number;
  bonusUsers: number;
  bonusProducts: number;
  bonusOrdersPerMonth: number;
  bonusCustomers: number;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  redemptionsCount: number;
  benefitSummary: string[];
  state: "live" | "scheduled" | "expired" | "inactive" | "depleted";
  lastRedemption?: {
    redeemedAt: string;
    email: string | null;
    companyName: string | null;
  } | null;
}

export interface PlatformSignupCouponSummary {
  totalCoupons: number;
  liveCoupons: number;
  scheduledCoupons: number;
  expiredCoupons: number;
  inactiveCoupons: number;
  depletedCoupons: number;
  totalRedemptions: number;
}

export interface PlatformSignupCouponFormPayload
  extends PlatformSignupCouponBenefits {
  name: string;
  code: string;
  description: string;
  usageLimit: number | null;
  isActive: boolean;
  validFrom: string;
  validTo: string;
}

export interface SignupCouponValidationResult {
  code: string;
  name: string;
  description: string;
  benefits: PlatformSignupCouponBenefits;
  benefitSummary: string[];
}

export interface RemovePlatformSignupCouponResult {
  action: "deleted" | "deactivated";
  couponId?: string;
  coupon?: PlatformSignupCoupon | null;
}

const zeroBenefits: PlatformSignupCouponBenefits = {
  trialDays: 0,
  bonusUsers: 0,
  bonusProducts: 0,
  bonusOrdersPerMonth: 0,
  bonusCustomers: 0,
};

const unwrapData = <T,>(payload: any, fallback: T): T => {
  if (payload?.data !== undefined) {
    return payload.data as T;
  }

  return (payload ?? fallback) as T;
};

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCoupon = (value: Partial<PlatformSignupCoupon>): PlatformSignupCoupon => ({
  id: String(value.id || ""),
  code: String(value.code || ""),
  name: String(value.name || ""),
  description: String(value.description || ""),
  trialDays: normalizeNumber(value.trialDays),
  bonusUsers: normalizeNumber(value.bonusUsers),
  bonusProducts: normalizeNumber(value.bonusProducts),
  bonusOrdersPerMonth: normalizeNumber(value.bonusOrdersPerMonth),
  bonusCustomers: normalizeNumber(value.bonusCustomers),
  usageLimit:
    value.usageLimit === null || value.usageLimit === undefined
      ? null
      : normalizeNumber(value.usageLimit),
  usageCount: normalizeNumber(value.usageCount),
  isActive: Boolean(value.isActive),
  validFrom: String(value.validFrom || ""),
  validTo: String(value.validTo || ""),
  createdBy: value.createdBy ?? null,
  createdAt: value.createdAt ?? null,
  updatedAt: value.updatedAt ?? null,
  redemptionsCount: normalizeNumber(value.redemptionsCount),
  benefitSummary: Array.isArray(value.benefitSummary)
    ? value.benefitSummary.map(String)
    : [],
  state: (value.state as PlatformSignupCoupon["state"]) || "inactive",
  lastRedemption: value.lastRedemption ?? null,
});

const normalizeSummary = (
  value?: Partial<PlatformSignupCouponSummary> | null,
): PlatformSignupCouponSummary => ({
  totalCoupons: normalizeNumber(value?.totalCoupons),
  liveCoupons: normalizeNumber(value?.liveCoupons),
  scheduledCoupons: normalizeNumber(value?.scheduledCoupons),
  expiredCoupons: normalizeNumber(value?.expiredCoupons),
  inactiveCoupons: normalizeNumber(value?.inactiveCoupons),
  depletedCoupons: normalizeNumber(value?.depletedCoupons),
  totalRedemptions: normalizeNumber(value?.totalRedemptions),
});

const normalizeValidation = (
  value?: Partial<SignupCouponValidationResult> | null,
): SignupCouponValidationResult => ({
  code: String(value?.code || ""),
  name: String(value?.name || ""),
  description: String(value?.description || ""),
  benefits: {
    trialDays: normalizeNumber(value?.benefits?.trialDays),
    bonusUsers: normalizeNumber(value?.benefits?.bonusUsers),
    bonusProducts: normalizeNumber(value?.benefits?.bonusProducts),
    bonusOrdersPerMonth: normalizeNumber(value?.benefits?.bonusOrdersPerMonth),
    bonusCustomers: normalizeNumber(value?.benefits?.bonusCustomers),
  },
  benefitSummary: Array.isArray(value?.benefitSummary)
    ? value!.benefitSummary!.map(String)
    : [],
});

const normalizeRemoval = (
  value?: Partial<RemovePlatformSignupCouponResult> | null,
): RemovePlatformSignupCouponResult => ({
  action:
    value?.action === "deactivated" ? "deactivated" : "deleted",
  couponId: value?.couponId ? String(value.couponId) : undefined,
  coupon: value?.coupon ? normalizeCoupon(value.coupon) : null,
});

export const platformSignupCouponService = {
  zeroBenefits,

  async listCoupons(search = "", state = "all"): Promise<{
    items: PlatformSignupCoupon[];
    summary: PlatformSignupCouponSummary;
  }> {
    const response = await apiClient.get("/super-admin/platform/signup-coupons", {
      params: {
        search,
        state,
      },
    });

    const payload = unwrapData<{ items?: PlatformSignupCoupon[]; summary?: PlatformSignupCouponSummary }>(
      response.data,
      { items: [], summary: normalizeSummary(null) },
    );

    return {
      items: Array.isArray(payload.items)
        ? payload.items.map(normalizeCoupon)
        : [],
      summary: normalizeSummary(payload.summary),
    };
  },

  async createCoupon(
    payload: PlatformSignupCouponFormPayload,
  ): Promise<PlatformSignupCoupon> {
    const response = await apiClient.post(
      "/super-admin/platform/signup-coupons",
      payload,
    );
    return normalizeCoupon(unwrapData(response.data, {}));
  },

  async updateCoupon(
    couponId: string,
    payload: PlatformSignupCouponFormPayload,
  ): Promise<PlatformSignupCoupon> {
    const response = await apiClient.put(
      `/super-admin/platform/signup-coupons/${couponId}`,
      payload,
    );
    return normalizeCoupon(unwrapData(response.data, {}));
  },

  async removeCoupon(
    couponId: string,
  ): Promise<RemovePlatformSignupCouponResult> {
    const response = await apiClient.delete(
      `/super-admin/platform/signup-coupons/${couponId}`,
    );
    return normalizeRemoval(unwrapData(response.data, {}));
  },

  async validatePromoCode(
    promoCode: string,
  ): Promise<SignupCouponValidationResult> {
    const response = await apiClient.post(
      "/auth/signup-coupon/validate",
      { promoCode },
      { _skipErrorToast: true },
    );

    return normalizeValidation(unwrapData(response.data, {}));
  },
};

export default platformSignupCouponService;
