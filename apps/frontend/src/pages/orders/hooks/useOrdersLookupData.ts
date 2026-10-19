import { useState, useEffect, useMemo } from "react";
import i18n from "../../../i18n";
import { apiClient } from "../../../services/apiClient";
import { queryClient } from "../../../config/queryClient";

import type {
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
  ActiveCarrierOption,
  UseOrdersLookupDataParams,
  UseOrdersLookupDataReturn,
} from "./useOrdersLookupData.types";

export type {
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
  ActiveCarrierOption,
  UseOrdersLookupDataParams,
  UseOrdersLookupDataReturn,
};


export const useOrdersLookupData = ({
  companyId,
  isAdmin,
  isMerchant,
  canSelectOrders,
  merchantFilterId,
  merchantFilterLength,
  defaultOrderStatuses,
  defaultPaymentStatuses,
  normalizeStatusCode,
  getApiErrorMessage,
}: UseOrdersLookupDataParams): UseOrdersLookupDataReturn => {
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusDefinition[]>(defaultOrderStatuses);
  const [paymentStatuses, setPaymentStatuses] = useState<OrderStatusDefinition[]>(defaultPaymentStatuses);
  const [merchantOptions, setMerchantOptions] = useState<MerchantFilterOption[]>([]);
  const [affiliateOptions, setAffiliateOptions] = useState<AffiliateFilterOption[]>([]);
  const [merchantSettlementSummary, setMerchantSettlementSummary] = useState<any | null>(null);
  const [merchantSettlementLoading, setMerchantSettlementLoading] = useState(false);
  const [merchantSettlementError, setMerchantSettlementError] = useState("");
  const [activeCarriers, setActiveCarriers] = useState<ActiveCarrierOption[]>([]);

  // 1. Fetch Order and Payment Statuses
  useEffect(() => {
    let isMounted = true;

    const fetchOrderStatuses = async () => {
      try {
        const cacheKey = ["order-statuses", companyId];
        let fetchedStatuses = queryClient.getQueryData<
          Array<Partial<OrderStatusDefinition> & { statusType?: string }>
        >(cacheKey);

        if (!fetchedStatuses || fetchedStatuses.length === 0) {
          const response = await apiClient.get("/order-status", {
            _skipErrorToast: true,
          });
          if (!response.data?.success) {
            return;
          }
          fetchedStatuses = Array.isArray(response.data.data)
            ? (response.data.data as Array<Partial<OrderStatusDefinition> & { statusType?: string }>)
            : [];
          if (fetchedStatuses.length > 0) {
            queryClient.setQueryData(cacheKey, fetchedStatuses);
          }
        }

        const useDefaults = fetchedStatuses.length === 0;
        const mergedOrderStatuses = new Map(
          useDefaults ? defaultOrderStatuses.map((status) => [status.code, status]) : [],
        );
        const mergedPaymentStatuses = new Map(
          useDefaults ? defaultPaymentStatuses.map((status) => [status.code, status]) : [],
        );

        fetchedStatuses.forEach((status) => {
          const normalizedCode = normalizeStatusCode(status?.code);
          if (!normalizedCode) return;

          const def: OrderStatusDefinition = {
            ...status,
            code: normalizedCode,
            name: typeof status.name === "string" ? status.name : normalizedCode,
          };

          if (status.statusType === "payment") {
            mergedPaymentStatuses.set(normalizedCode, def);
          } else {
            mergedOrderStatuses.set(normalizedCode, def);
          }
        });

        if (isMounted) {
          setOrderStatuses(Array.from(mergedOrderStatuses.values()));
          setPaymentStatuses(Array.from(mergedPaymentStatuses.values()));
        }
      } catch (error) {
        console.error("Failed to fetch order and payment statuses for list view:", error);
      }
    };

    void fetchOrderStatuses();

    return () => {
      isMounted = false;
    };
  }, [companyId, defaultOrderStatuses, defaultPaymentStatuses, normalizeStatusCode]);

  // 2. Fetch Merchant & Affiliate Options
  useEffect(() => {
    if (!isAdmin || isMerchant) {
      setMerchantOptions([]);
      setAffiliateOptions([]);
      return;
    }

    let isMounted = true;

    const fetchUnifiedOperationOptions = async () => {
      const cacheKey = ["unified-operation-options", companyId];
      const cached = queryClient.getQueryData<{
        merchants: MerchantFilterOption[];
        affiliates: AffiliateFilterOption[];
      }>(cacheKey);

      if (cached) {
        if (isMounted) {
          setMerchantOptions(cached.merchants || []);
          setAffiliateOptions(cached.affiliates || []);
        }
        return;
      }

      const [merchantsResult, affiliatesResult] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data?: MerchantFilterOption[] }>("/merchants", {
          _skipErrorToast: true,
        }),
        apiClient.get<{ success: boolean; data?: AffiliateFilterOption[] }>("/affiliates/list", {
          _skipErrorToast: true,
        }),
      ]);

      if (!isMounted) return;

      const merchants =
        merchantsResult.status === "fulfilled" &&
        merchantsResult.value.data.success &&
        Array.isArray(merchantsResult.value.data.data)
          ? merchantsResult.value.data.data
          : [];
      const affiliates =
        affiliatesResult.status === "fulfilled" &&
        affiliatesResult.value.data.success &&
        Array.isArray(affiliatesResult.value.data.data)
          ? affiliatesResult.value.data.data
          : [];

      queryClient.setQueryData(cacheKey, { merchants, affiliates });
      setMerchantOptions(merchants);
      setAffiliateOptions(affiliates);

      if (merchantsResult.status === "rejected" || affiliatesResult.status === "rejected") {
        console.warn("Failed to load some unified order operation filters:", {
          merchantsError: merchantsResult.status === "rejected" ? merchantsResult.reason : undefined,
          affiliatesError: affiliatesResult.status === "rejected" ? affiliatesResult.reason : undefined,
        });
      }
    };

    void fetchUnifiedOperationOptions();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isMerchant, companyId]);

  // 3. Fetch Active Carriers
  useEffect(() => {
    if (!canSelectOrders) return;
    let isMounted = true;

    const fetchActiveCarriers = async () => {
      const cacheKey = ["active-carriers", companyId];
      const cached = queryClient.getQueryData<ActiveCarrierOption[]>(cacheKey);
      if (cached && cached.length > 0) {
        if (isMounted) setActiveCarriers(cached);
        return;
      }

      try {
        let activeList: ActiveCarrierOption[] = [];
        try {
          const res = await apiClient.get<{ success: boolean; data?: typeof activeList }>(
            "/shipping-companies/active-carriers",
            { _skipErrorToast: true } as any,
          );
          if (res.data?.success && Array.isArray(res.data.data)) {
            activeList = res.data.data;
          }
        } catch {
          const fallbackRes = await apiClient.get<{ success: boolean; data?: typeof activeList }>(
            "/shipping-companies?status=active&all=true",
            { _skipErrorToast: true } as any,
          );
          if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data)) {
            activeList = fallbackRes.data.data.filter((c) => c.isActive);
          }
        }
        if (!isMounted) return;
        queryClient.setQueryData(cacheKey, activeList);
        setActiveCarriers(activeList);
      } catch {
        // Silently ignore
      }
    };

    void fetchActiveCarriers();

    return () => {
      isMounted = false;
    };
  }, [canSelectOrders, companyId]);

  // 4. Fetch Merchant Settlement Summary if single merchant selected
  useEffect(() => {
    if (!isAdmin || isMerchant || merchantFilterLength !== 1 || !merchantFilterId) {
      setMerchantSettlementSummary(null);
      setMerchantSettlementError("");
      setMerchantSettlementLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMerchantSettlementSummary = async () => {
      try {
        setMerchantSettlementLoading(true);
        setMerchantSettlementError("");
        const response = await apiClient.get<{
          success?: boolean;
          data?: any;
          message?: string;
        }>(`/merchants/${merchantFilterId}/settlement-summary`, {
          _skipErrorToast: true,
        });

        if (!isMounted) return;

        if (response.data?.success && response.data.data) {
          setMerchantSettlementSummary(response.data.data);
        } else {
          setMerchantSettlementSummary(null);
          setMerchantSettlementError(response.data?.message || i18n.t("orders.merchantLoadError"));
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        console.warn("Failed to load merchant settlement summary:", error);
        setMerchantSettlementSummary(null);
        setMerchantSettlementError(getApiErrorMessage(error, i18n.t("orders.merchantLoadError")));
      } finally {
        if (isMounted) {
          setMerchantSettlementLoading(false);
        }
      }
    };

    void fetchMerchantSettlementSummary();

    return () => {
      isMounted = false;
    };
  }, [merchantFilterId, merchantFilterLength, isAdmin, isMerchant, getApiErrorMessage]);

  // Derived maps and carrier booleans
  const orderStatusMap = useMemo(
    () =>
      new Map(
        orderStatuses.map((status) => [
          normalizeStatusCode(status.code),
          {
            ...status,
            code: normalizeStatusCode(status.code),
          },
        ]),
      ),
    [orderStatuses, normalizeStatusCode],
  );

  const paymentStatusMap = useMemo(
    () =>
      new Map(
        paymentStatuses.map((status) => [
          normalizeStatusCode(status.code),
          {
            ...status,
            code: normalizeStatusCode(status.code),
          },
        ]),
      ),
    [paymentStatuses, normalizeStatusCode],
  );

  const hasActiveTurbo = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "TURBO" ||
          c.slug === "turbo" ||
          c.name?.toLowerCase().includes("turbo") ||
          c.name?.includes("تربو")),
    );
  }, [activeCarriers]);

  const hasActiveQpExpress = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "QP_EXPRESS" ||
          c.slug === "qp-express" ||
          c.name?.toLowerCase().includes("qp") ||
          c.name?.includes("كيو بي")),
    );
  }, [activeCarriers]);

  const hasActiveBosta = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "BOSTA" ||
          c.slug === "bosta" ||
          c.name?.toLowerCase().includes("bosta") ||
          c.name?.includes("بوستا")),
    );
  }, [activeCarriers]);

  return {
    orderStatuses,
    paymentStatuses,
    orderStatusMap,
    paymentStatusMap,
    merchantOptions,
    affiliateOptions,
    merchantSettlementSummary,
    merchantSettlementLoading,
    merchantSettlementError,
    activeCarriers,
    hasActiveTurbo,
    hasActiveQpExpress,
    hasActiveBosta,
  };
};

export default useOrdersLookupData;
