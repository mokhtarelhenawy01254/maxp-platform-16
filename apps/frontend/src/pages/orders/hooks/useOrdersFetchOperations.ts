import React, { useCallback, useEffect, useRef } from "react";
import i18n from "../../../i18n";
import { apiClient } from "../../../services/apiClient";
import { queryClient } from "../../../config/queryClient";
import { transformOrder, isRecord } from "../utils/orderTransformer";
import type { Order } from "../utils/orderTransformer";
import { getOrdersLoadErrorMessage } from "../utils/ordersTableHelpers";
import type { OrdersFilters } from "../ordersFilterTypes";

export interface UseOrdersFetchOperationsParams {
  companyId: string;
  page: number;
  limit: number;
  filters: OrdersFilters;
  effectiveFilters: OrdersFilters;
  isMerchant: boolean;
  ordersRef: React.MutableRefObject<Order[]>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  setTotalOrders: React.Dispatch<React.SetStateAction<number>>;
  setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setOrdersLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  setLastUpdatedAt: React.Dispatch<React.SetStateAction<Date | null>>;
  setShowIncompleteInOrders?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseOrdersFetchOperationsReturn {
  fetchOrders: () => Promise<void>;
  fetchOrdersRef: React.MutableRefObject<() => Promise<void>>;
}

export function useOrdersFetchOperations({
  companyId,
  page,
  limit,
  filters,
  effectiveFilters,
  isMerchant,
  ordersRef,
  setOrders,
  setTotalPages,
  setTotalOrders,
  setSelectedOrders,
  setPage,
  setLoading,
  setOrdersLoadError,
  setLastUpdatedAt,
  setShowIncompleteInOrders,
}: UseOrdersFetchOperationsParams): UseOrdersFetchOperationsReturn {
  const fetchOrdersRef = useRef<() => Promise<void>>(async () => undefined);

  const fetchOrders = useCallback(async () => {
    try {
      const orderListCacheKey = [
        "orders-page-cache",
        companyId,
        page,
        limit,
        effectiveFilters,
      ];
      const cached = queryClient.getQueryData<{
        orders: Order[];
        totalPages: number;
        totalOrders: number;
      }>(orderListCacheKey);

      if (cached && cached.orders.length > 0) {
        setOrders(cached.orders);
        setTotalPages(cached.totalPages);
        setTotalOrders(cached.totalOrders);
        setLoading(false);
      } else if (ordersRef.current.length === 0) {
        setLoading(true);
      }
      setOrdersLoadError(null);

      // Merchants use the same core Orders screen, scoped by the simple orders API.
      const usesUnifiedOperationFilters = Boolean(
        filters.merchantId.length > 0 ||
          filters.affiliateId.length > 0 ||
          filters.fulfillmentSource.length > 0 ||
          filters.merchantOperationStatus.length > 0 ||
          filters.merchantSettlementStatus.length > 0,
      );
      const useEnhanced =
        !isMerchant &&
        !usesUnifiedOperationFilters &&
        (filters.extractionMethod || filters.minConfidence);

      if (useEnhanced) {
        // Use enhanced orders API with apiClient
        const queryParams = {
          page: page.toString(),
          limit: limit.toString(),
          ...(filters.status.length > 0 && {
            status: filters.status.map((s) => s.toUpperCase()).join(","),
          }),
          ...(filters.paymentStatus.length > 0 && {
            paymentStatus: filters.paymentStatus.map((s) => s.toUpperCase()).join(","),
          }),
          ...(filters.sourceType.length > 0 && {
            sourceType: filters.sourceType.join(","),
          }),
          ...(filters.search && { search: filters.search }),
          ...(filters.extractionMethod && {
            extractionMethod: filters.extractionMethod,
          }),
          ...(filters.minConfidence && {
            minConfidence: filters.minConfidence,
          }),
          ...(filters.startDate && { dateFrom: filters.startDate }),
          ...(filters.endDate && { dateTo: filters.endDate }),
          ...(filters.onlyUnseen && { onlyUnseen: "true" }),
          ...(filters.onlyPostPurchaseOffer && { onlyPostPurchaseOffer: "true" }),
        };

        const response = await apiClient.get("/orders-enhanced", {
          params: queryParams,
          _skipErrorToast: true,
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (
            Array.isArray(data.data) ? data.data : []
          ).map(transformOrder);
          const nextTotalPages = Math.max(
            Number(data.pagination?.pages) || 0,
            transformedOrders.length > 0 ? 1 : 0,
          );
          const nextTotalOrders =
            Number(data.pagination?.total) || transformedOrders.length;

          if (nextTotalOrders === 0 && page !== 1) {
            setOrders([]);
            setTotalPages(0);
            setTotalOrders(0);
            setSelectedOrders([]);
            setPage(1);
            return;
          }

          if (nextTotalPages > 0 && page > nextTotalPages) {
            setTotalPages(nextTotalPages);
            setTotalOrders(nextTotalOrders);
            setSelectedOrders([]);
            setPage(nextTotalPages);
            return;
          }

          setOrders(transformedOrders);
          setTotalPages(nextTotalPages);
          setTotalOrders(nextTotalOrders);
          queryClient.setQueryData(orderListCacheKey, {
            orders: transformedOrders,
            totalPages: nextTotalPages,
            totalOrders: nextTotalOrders,
          });
          setSelectedOrders([]);
          setLastUpdatedAt(new Date());
          setOrdersLoadError(null);
        } else {
          console.error("Failed to fetch enhanced orders:", data.message);
          setOrdersLoadError(i18n.t("orders.failedToLoadOrdersShort"));
        }
      } else {
        // Use simple orders API
        const queryParams: Record<string, string> = {
          page: page.toString(),
          limit: limit.toString(),
        };

        if (filters.status.length > 0) queryParams.status = filters.status.join(",");
        if (filters.paymentStatus.length > 0)
          queryParams.paymentStatus = filters.paymentStatus.join(",");
        if (filters.sourceType.length > 0) queryParams.sourceType = filters.sourceType.join(",");
        if (filters.merchantId.length > 0) queryParams.merchantId = filters.merchantId.join(",");
        if (filters.affiliateId.length > 0) queryParams.affiliateId = filters.affiliateId.join(",");
        if (filters.fulfillmentSource.length > 0)
          queryParams.fulfillmentSource = filters.fulfillmentSource.join(",");
        if (filters.merchantOperationStatus.length > 0)
          queryParams.merchantOperationStatus = filters.merchantOperationStatus.join(",");
        if (filters.merchantSettlementStatus.length > 0)
          queryParams.merchantSettlementStatus = filters.merchantSettlementStatus.join(",");
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = filters.startDate;
        if (filters.endDate) queryParams.endDate = filters.endDate;
        if (filters.onlyUnseen) queryParams.onlyUnseen = "true";
        if (filters.onlyPostPurchaseOffer) queryParams.onlyPostPurchaseOffer = "true";

        const response = await apiClient.get("/orders-new/simple", {
          params: queryParams,
          _skipErrorToast: true,
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (
            Array.isArray(data.data) ? data.data : []
          ).map(transformOrder);
          const nextTotalPages = Math.max(
            Number(data.pagination?.pages) || 0,
            transformedOrders.length > 0 ? 1 : 0,
          );
          const nextTotalOrders =
            Number(data.pagination?.total) || transformedOrders.length;

          if (nextTotalOrders === 0 && page !== 1) {
            setOrders([]);
            setTotalPages(0);
            setTotalOrders(0);
            setSelectedOrders([]);
            setPage(1);
            return;
          }

          if (nextTotalPages > 0 && page > nextTotalPages) {
            setTotalPages(nextTotalPages);
            setTotalOrders(nextTotalOrders);
            setSelectedOrders([]);
            setPage(nextTotalPages);
            return;
          }

          setOrders(transformedOrders);
          setTotalPages(nextTotalPages);
          setTotalOrders(nextTotalOrders);
          queryClient.setQueryData(orderListCacheKey, {
            orders: transformedOrders,
            totalPages: nextTotalPages,
            totalOrders: nextTotalOrders,
          });
          setSelectedOrders([]);
          setLastUpdatedAt(new Date());
          setOrdersLoadError(null);
          const metaFlag = (data as { meta?: { showIncompleteCartsInOrders?: boolean } })?.meta;
          if (metaFlag && typeof metaFlag.showIncompleteCartsInOrders === "boolean") {
            setShowIncompleteInOrders?.(metaFlag.showIncompleteCartsInOrders);
          }
        } else {
          console.error("Failed to fetch orders:", data.message);
          setOrdersLoadError(i18n.t("orders.failedToLoadOrdersShort"));
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      if (
        isRecord(error) &&
        "response" in error &&
        isRecord(error.response) &&
        "data" in error.response &&
        isRecord(error.response.data) &&
        typeof error.response.data.message === "string"
      ) {
        console.error("Error message:", error.response.data.message);
      }
      setOrdersLoadError(getOrdersLoadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    effectiveFilters,
    filters,
    isMerchant,
    limit,
    ordersRef,
    page,
    setLastUpdatedAt,
    setLoading,
    setOrders,
    setOrdersLoadError,
    setPage,
    setSelectedOrders,
    setShowIncompleteInOrders,
    setTotalOrders,
    setTotalPages,
  ]);

  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    void fetchOrdersRef.current();
  }, [page, limit, effectiveFilters]);

  return {
    fetchOrders,
    fetchOrdersRef,
  };
}
