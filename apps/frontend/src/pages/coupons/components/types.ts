export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: "percentage" | "fixed" | "free_shipping" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  userUsageLimit?: number | null;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  customerSegments?: string[] | string | null;
  allowWithLoyalty?: boolean;
  createdAt?: string;
  createdBy?: string;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalUsages: number;
  totalDiscount: number;
}

export interface CouponFilters {
  isActive: string;
  type: string;
  customerSegment: string;
}

export interface NewCouponState {
  code: string;
  name: string;
  description: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  userUsageLimit: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  customerSegments: string[];
  allowWithLoyalty: boolean;
}
