import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

export interface CustomerLoyaltyTierInfo {
  id: string;
  name: string;
  nameAr?: string | null;
  color?: string | null;
  icon?: string | null;
  benefits?: Record<string, unknown> | null;
}

export interface CustomerLoyaltyNextTierInfo {
  id: string;
  name: string;
  nameAr?: string | null;
  targetMetric: number;
  remainingMetric: number;
  benefits?: Record<string, unknown> | null;
}

export interface CustomerLoyaltySummary {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    joinedAt?: string | null;
    address?: string | null;
  };
  company: {
    id: string;
    name?: string | null;
    nameAr?: string | null;
    currency: string;
    logo?: string | null;
    loyaltySystem: string;
  };
  loyaltySystem: string;
  card: {
    url: string | null;
    filePath?: string | null;
    generated?: boolean;
    membershipNumber: string | null;
    tierId: string | null;
    tierName?: string | null;
  } | null;
  loyalty: {
    method: string | null;
    metricLabel: string;
    currentMetric: number;
    tier: CustomerLoyaltyTierInfo | null;
    nextTier: CustomerLoyaltyNextTierInfo | null;
    rewards: { freeShipping?: boolean; discountPercent?: number };
    points: {
      current: number;
      totalEarned: number;
      totalRedeemed: number;
      joinedAt?: string | null;
    };
  };
  autoDiscount: {
    discountPercent: number;
    validityDays: number;
    status?: string | null;
    activeVoucher: {
      id: string;
      percent: number;
      amount: number;
      expiresAt: string;
      sourceOrderNumber?: string | null;
    } | null;
  } | null;
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalCashback: number;
    currency: string;
  };
  storePromotion?: {
    id: string;
    title: string;
    tiers?: Array<{
      minQuantity: number;
      items: number;
      type: string;
      value: number;
      label?: string;
    }>;
    startDate?: string | null;
    endDate?: string | null;
    barVisible?: boolean;
    barSticky?: boolean;
    barPages?: string;
    disableOtherDiscounts?: boolean;
  } | null;
}

export function useCustomerLoyaltySummary(customerId?: string) {
  const [data, setData] = useState<CustomerLoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = customerId
        ? `/hr/customer-loyalty/customers/${customerId}/portal-summary`
        : "/public/customers/loyalty-summary";
      const res = await apiClient.get(url);
      setData(res.data?.data || null);
    } catch (err) {
      const error = err as {
        response?: { data?: { message?: string } };
      };
      setError(error?.response?.data?.message || "تعذر تحميل بياناتك، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
