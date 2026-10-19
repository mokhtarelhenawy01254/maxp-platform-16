import React, { useRef } from "react";
import type { TFunction } from "i18next";
import { apiClient } from "../../../../services/apiClient";
import { toast } from "sonner";
import { extractApiErrorMessage } from "../apiError";
import { mapIncompleteCart } from "../incompleteCartMapper";
import { buildQueueParams } from "../workspaceQueueParams";
import type {
  FilterTab,
  WorkspaceOrder,
  WorkspacePagination,
  WorkspaceStats,
} from "../types";

export interface UseWorkspaceOrdersFetcherParams {
  activeTabRef: React.MutableRefObject<FilterTab>;
  sortOptionRef: React.MutableRefObject<"recent" | "oldest" | "attempts">;
  selectedAgentIdRef: React.MutableRefObject<string | null>;
  searchQueryRef: React.MutableRefObject<string>;
  searchParams: URLSearchParams;
  isArabic: boolean;
  t: TFunction;
  setOrders: React.Dispatch<React.SetStateAction<WorkspaceOrder[]>>;
  setSelectedOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPagination: React.Dispatch<React.SetStateAction<WorkspacePagination>>;
  setStats: React.Dispatch<React.SetStateAction<WorkspaceStats | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
  setFetchError: React.Dispatch<React.SetStateAction<string | null>>;
  setLastFetchedAt: React.Dispatch<React.SetStateAction<number | null>>;
  setConfirmationDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface FetchOrdersOptions {
  silent?: boolean;
  page?: number;
  append?: boolean;
  tab?: FilterTab;
  sort?: "recent" | "oldest" | "attempts";
  assignedTo?: string | null;
  search?: string;
  withStats?: boolean;
}

export const useWorkspaceOrdersFetcher = ({
  activeTabRef,
  sortOptionRef,
  selectedAgentIdRef,
  searchQueryRef,
  searchParams,
  isArabic,
  t,
  setOrders,
  setSelectedOrderId,
  setPage,
  setPagination,
  setStats,
  setLoading,
  setRefreshing,
  setLoadingMore,
  setFetchError,
  setLastFetchedAt,
  setConfirmationDisabled,
}: UseWorkspaceOrdersFetcherParams) => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = async (options?: FetchOrdersOptions) => {
    const {
      silent = false,
      page: targetPage = 1,
      append = false,
      tab,
      sort: targetSort,
      assignedTo: targetAssignedTo,
      search: targetSearch,
    } = options || {};

    const activeTabForRequest = tab ?? activeTabRef.current;
    const resolvedSort = targetSort ?? sortOptionRef.current;
    const resolvedAssignedTo =
      targetAssignedTo !== undefined ? targetAssignedTo : selectedAgentIdRef.current;
    const resolvedSearch = targetSearch !== undefined ? targetSearch : searchQueryRef.current;

    if (!append) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }
    const signal = abortControllerRef.current?.signal;

    try {
      if (append) {
        setLoadingMore(true);
      } else if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { params } = buildQueueParams({
        activeTab: activeTabForRequest,
        sort: resolvedSort,
        assignedTo: resolvedAssignedTo,
        search: resolvedSearch,
        page: targetPage,
        withStats: options?.withStats !== false,
      });

      let response: any = null;
      let incRes: any = null;

      if (activeTabForRequest === "incomplete") {
        const [statsResponse, incompleteResponse] = await Promise.all([
          apiClient
            .get("/agent-workspace/my-orders", { params: { withStats: 1, limit: 1 }, signal })
            .catch(() => null),
          apiClient.get("/orders-new/incomplete", {
            params: {
              limit: 50,
              hasPhone: "true",
              page: targetPage,
              search: resolvedSearch ? resolvedSearch.trim() : undefined,
            },
            signal,
          }),
        ]);
        response = statsResponse;
        incRes = incompleteResponse;
      } else {
        const [ordersResponse] = await Promise.all([
          apiClient.get("/agent-workspace/my-orders", { params, signal }),
        ]);
        response = ordersResponse;
      }

      const payload = response?.data as any;

      if (typeof payload?.confirmationDisabled === "boolean") {
        setConfirmationDisabled(payload.confirmationDisabled);
      }

      if (activeTabForRequest !== "incomplete" && !payload?.success) {
        throw new Error(
          (typeof payload?.error === "string" && payload.error) ||
            payload?.message ||
            t("orders.loadingFailed"),
        );
      }

      let nextOrders: WorkspaceOrder[] = [];
      let nextTotal = 0;
      let nextPages = 1;
      let nextPage = targetPage;

      if (activeTabForRequest === "incomplete") {
        if (incRes?.data && incRes.data.success === false) {
          throw new Error(
            (typeof incRes.data?.error === "string" && incRes.data.error) ||
              incRes.data?.message ||
              t("orders.loadingFailed"),
          );
        }
        if (incRes?.data?.data && Array.isArray(incRes.data.data)) {
          nextOrders = (incRes.data.data as any[])
            .filter((cart: any) => cart && (cart.cartId || cart.id))
            .map((cart: any) => mapIncompleteCart(cart, isArabic));
        }
        const incPagination = incRes?.data?.pagination;
        nextTotal = Number(incPagination?.total) || nextOrders.length;
        nextPages = Number(incPagination?.pages) || 1;
        nextPage = Number(incPagination?.page) || targetPage;
      } else {
        nextOrders = Array.isArray(payload?.data) ? payload.data : [];
        const paginationData: any = payload?.pagination;
        nextTotal = Number(paginationData?.total) || 0;
        nextPages = Number(paginationData?.pages) || 1;
        nextPage = Number(paginationData?.page) || targetPage;
      }

      if (resolvedSort === "oldest") {
        nextOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (resolvedSort === "attempts") {
        nextOrders.sort((a, b) => (b.callAttempts || 0) - (a.callAttempts || 0));
      } else {
        nextOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      if (append) {
        setOrders((prev) => {
          const byId = new Map(prev.map((o) => [o.id, o]));
          nextOrders.forEach((o) => byId.set(o.id, o));
          return Array.from(byId.values());
        });
      } else {
        setOrders(nextOrders);
        if (nextOrders.length > 0) {
          setSelectedOrderId((prev) => {
            if (prev && nextOrders.some((o) => o.id === prev)) {
              return prev;
            }
            const urlOrder = searchParams.get("order");
            if (urlOrder && nextOrders.some((o) => o.id === urlOrder)) {
              return urlOrder;
            }
            return nextOrders[0].id;
          });
        } else {
          setSelectedOrderId(null);
        }
      }

      setPage(append ? nextPage : 1);
      setPagination({
        total: nextTotal,
        page: nextPage,
        limit: 50,
        pages: nextPages,
      });

      if (payload?.stats && typeof payload.stats === "object") {
        setStats({
          total: Number(payload.stats.total) || 0,
          all: Number(payload.stats.all ?? payload.stats.total) || 0,
          today: Number(payload.stats.today) || 0,
          pending: Number(payload.stats.pending) || 0,
          processing: Number(payload.stats.processing) || 0,
          confirmed: Number(payload.stats.confirmed) || 0,
          cancelled: Number(payload.stats.cancelled) || 0,
          followup: Number(payload.stats.followup) || 0,
          incomplete: Number(incRes?.data?.pagination?.total ?? payload.stats.incomplete) || 0,
        });
      }

      setFetchError(null);
      setLastFetchedAt(Date.now());
    } catch (error: any) {
      if (
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED" ||
        error?.message === "canceled"
      ) {
        return;
      }
      console.error("Failed to fetch orders:", error);
      const message = extractApiErrorMessage(error) || t("orders.loadingFailed");
      if (!silent) {
        setFetchError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  return {
    fetchOrders,
  };
};
