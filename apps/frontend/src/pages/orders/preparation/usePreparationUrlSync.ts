import { useEffect, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { PAGE_SIZE_OPTIONS, type PageSize } from "./constants";
import type { PreparationQueueUiState, PreparationQueueUiActions } from "./usePreparationQueueUiState";

export const PREPARATION_STORAGE_KEY = "preparation:queue:view-state:v1";

export const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const readStoredPreparationState = (): Partial<PreparationQueueUiState> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREPARATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const getInitialPreparationState = (searchParams: URLSearchParams): Partial<PreparationQueueUiState> => {
  const hasQueryKeys = [
    "page",
    "pageSize",
    "activeStage",
    "warehouseId",
    "stockFilter",
    "shortageReason",
    "shortageFollowUp",
    "shortageOwner",
    "productFilter",
    "productId",
    "variantId",
    "itemCountFilter",
    "search",
    "sortBy",
    "sortOrder",
    "notPrinted",
    "noShippingCode",
  ].some((k) => searchParams.has(k));

  if (hasQueryKeys) {
    const pageSizeRaw = parsePositiveInt(searchParams.get("pageSize"), 12);
    const validPageSize = PAGE_SIZE_OPTIONS.includes(pageSizeRaw as PageSize)
      ? (pageSizeRaw as PageSize)
      : 12;
    return {
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: validPageSize,
      activeStage: searchParams.get("activeStage") || "ALL",
      selectedWarehouseId: searchParams.get("warehouseId") || "",
      stockFilter: (searchParams.get("stockFilter") as "all" | "ready" | "shortage") || "all",
      shortageReasonFilter:
        (searchParams.get("shortageReason") as
          | "all"
          | "stock_shortage"
          | "waiting_transfer"
          | "waiting_restock"
          | "other") || "all",
      shortageFollowUpFilter:
        (searchParams.get("shortageFollowUp") as "all" | "today" | "overdue" | "without_date") || "all",
      shortageOwnerFilter: searchParams.get("shortageOwner") || "",
      productFilter: searchParams.get("productFilter") || "",
      productIdFilter: searchParams.get("productId") || "",
      variantIdFilter: searchParams.get("variantId") || "",
      itemCountFilter: (searchParams.get("itemCountFilter") as "all" | "single" | "multiple") || "all",
      search: searchParams.get("search") || "",
      sortBy: (searchParams.get("sortBy") as "createdAt" | "totalUnits" | "totalValue") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
      notPrintedFilter: (searchParams.get("notPrinted") as "all" | "not_printed") || "all",
      noShippingCodeFilter: (searchParams.get("noShippingCode") as "all" | "no_shipping_code") || "all",
    };
  }

  const stored = readStoredPreparationState();
  if (stored) {
    return stored;
  }

  return {};
};

export interface UsePreparationUrlSyncParams {
  uiState: PreparationQueueUiState;
  uiActions: PreparationQueueUiActions;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

export function usePreparationUrlSync({
  uiState,
  uiActions,
  searchParams,
  setSearchParams,
}: UsePreparationUrlSyncParams) {
  const isSyncingFromUrlRef = useRef(false);
  const lastObservedSearchRef = useRef(searchParams.toString());

  // Incoming sync: when searchParams change externally (e.g. from app/sidebar links)
  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastObservedSearchRef.current) return;
    lastObservedSearchRef.current = currentSearch;

    const parsed = getInitialPreparationState(searchParams);
    isSyncingFromUrlRef.current = true;
    if (parsed.activeStage && parsed.activeStage !== uiState.activeStage) {
      uiActions.setActiveStage(parsed.activeStage);
    }
    if (parsed.selectedWarehouseId !== undefined && parsed.selectedWarehouseId !== uiState.selectedWarehouseId) {
      uiActions.setSelectedWarehouse(parsed.selectedWarehouseId);
    }
    if (parsed.stockFilter && parsed.stockFilter !== uiState.stockFilter) {
      uiActions.setStockFilter(parsed.stockFilter);
    }
    if (parsed.pageSize && parsed.pageSize !== uiState.pageSize) {
      uiActions.setPageSize(parsed.pageSize);
    }
    if (parsed.page && parsed.page !== uiState.page) {
      uiActions.resetPage();
    }
    const timer = setTimeout(() => {
      isSyncingFromUrlRef.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [searchParams, uiState.activeStage, uiState.selectedWarehouseId, uiState.stockFilter, uiState.pageSize, uiState.page, uiActions]);

  // Outgoing sync: state changes to URL and localStorage
  useEffect(() => {
    const nextState: Record<string, unknown> = {
      page: uiState.page,
      pageSize: uiState.pageSize,
      activeStage: uiState.activeStage,
      selectedWarehouseId: uiState.selectedWarehouseId,
      stockFilter: uiState.stockFilter,
      shortageReasonFilter: uiState.shortageReasonFilter,
      shortageFollowUpFilter: uiState.shortageFollowUpFilter,
      shortageOwnerFilter: uiState.shortageOwnerFilter,
      productFilter: uiState.productFilter,
      productIdFilter: uiState.productIdFilter,
      variantIdFilter: uiState.variantIdFilter,
      itemCountFilter: uiState.itemCountFilter,
      search: uiState.search,
      sortBy: uiState.sortBy,
      sortOrder: uiState.sortOrder,
      notPrintedFilter: uiState.notPrintedFilter,
      noShippingCodeFilter: uiState.noShippingCodeFilter,
    };

    const params: Record<string, string> = {};
    if (nextState.page !== 1) params.page = String(nextState.page);
    if (nextState.pageSize !== 12) params.pageSize = String(nextState.pageSize);
    if (nextState.activeStage !== "ALL") params.activeStage = String(nextState.activeStage);
    if (nextState.selectedWarehouseId) params.warehouseId = String(nextState.selectedWarehouseId);
    if (nextState.stockFilter !== "all") params.stockFilter = String(nextState.stockFilter);
    if (nextState.shortageReasonFilter !== "all") params.shortageReason = String(nextState.shortageReasonFilter);
    if (nextState.shortageFollowUpFilter !== "all") params.shortageFollowUp = String(nextState.shortageFollowUpFilter);
    if (nextState.shortageOwnerFilter) params.shortageOwner = String(nextState.shortageOwnerFilter);
    if (nextState.productFilter) params.productFilter = String(nextState.productFilter);
    if (nextState.productIdFilter) params.productId = String(nextState.productIdFilter);
    if (nextState.variantIdFilter) params.variantId = String(nextState.variantIdFilter);
    if (nextState.itemCountFilter !== "all") params.itemCountFilter = String(nextState.itemCountFilter);
    if (nextState.notPrintedFilter !== "all") params.notPrinted = String(nextState.notPrintedFilter);
    if (nextState.noShippingCodeFilter !== "all") params.noShippingCode = String(nextState.noShippingCodeFilter);
    if (nextState.search) params.search = String(nextState.search);
    if (nextState.sortBy !== "createdAt") params.sortBy = String(nextState.sortBy);

    if (!isSyncingFromUrlRef.current) {
      lastObservedSearchRef.current = new URLSearchParams(params).toString();
      setSearchParams(params, { replace: true });
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PREPARATION_STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // ignore
      }
    }
  }, [
    uiState.page,
    uiState.pageSize,
    uiState.activeStage,
    uiState.selectedWarehouseId,
    uiState.stockFilter,
    uiState.shortageReasonFilter,
    uiState.shortageFollowUpFilter,
    uiState.shortageOwnerFilter,
    uiState.productFilter,
    uiState.productIdFilter,
    uiState.variantIdFilter,
    uiState.itemCountFilter,
    uiState.search,
    uiState.sortBy,
    uiState.sortOrder,
    uiState.notPrintedFilter,
    uiState.noShippingCodeFilter,
    setSearchParams,
  ]);
}
