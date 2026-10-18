import { useEffect } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import {
  ORDERS_LIST_STORAGE_KEY,
  getFiltersFromSearchParams,
  parsePositiveInt,
  type OrdersFilters,
} from "../ordersFilterTypes";

export interface UseOrdersUrlSyncParams {
  filters: OrdersFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrdersFilters>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

export function useOrdersUrlSync({
  filters,
  setFilters,
  page,
  setPage,
  limit,
  setLimit,
  searchParams,
  setSearchParams,
}: UseOrdersUrlSyncParams): void {
  // Sync URL search parameters back to local filters state
  useEffect(() => {
    const newFilters = getFiltersFromSearchParams(searchParams);
    setFilters((prev) => {
      const isDifferent = Object.keys(newFilters).some(
        (key) =>
          String(newFilters[key as keyof OrdersFilters]) !==
          String(prev[key as keyof OrdersFilters]),
      );
      return isDifferent ? newFilters : prev;
    });

    const newPage = parsePositiveInt(searchParams.get("page"), 1);
    const newLimit = parsePositiveInt(searchParams.get("limit"), 20);
    setPage((prev) => (prev !== newPage ? newPage : prev));
    setLimit((prev) => (prev !== newLimit ? newLimit : prev));
  }, [searchParams, setFilters, setPage, setLimit]);

  // Sync filters, page, and limit to URL search parameters
  useEffect(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    (
      Object.entries(filters) as Array<
        [keyof OrdersFilters, OrdersFilters[keyof OrdersFilters]]
      >
    ).forEach(([key, value]) => {
      if (key === "onlyUnseen") {
        if (value) {
          params.onlyUnseen = "true";
        }
        return;
      }

      if (key === "onlyPostPurchaseOffer") {
        if (value) {
          params.onlyPostPurchaseOffer = "true";
        }
        return;
      }

      if (typeof value === "string" && value) {
        params[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        params[key] = value.join(",");
      }
    });

    setSearchParams(params, { replace: true });
  }, [filters, page, limit, setSearchParams]);

  // Persist current filters, page, and limit state in localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        ORDERS_LIST_STORAGE_KEY,
        JSON.stringify({
          page,
          limit,
          filters,
        }),
      );
    } catch (error) {
      console.warn("Failed to persist orders list state:", error);
    }
  }, [filters, page, limit]);
}
