import { apiClient } from "../../../services/apiClient";
import {
  DEFAULT_PREPARATION_QUEUE_SETTINGS,
  PAGE_SIZE,
  TERMINAL_NON_PREPARATION_STATUSES,
  type PageSize,
} from "./constants";
import {
  normalizeInventoryRecord,
  normalizePreparationQueueSettings,
  normalizeSimpleOrder,
  normalizeStatusConfig,
  normalizeWarehouseOption,
} from "./normalizers";
import type {
  ApiInventoryResponse,
  ApiPreparationOrdersResponse,
  ApiStatusResponse,
  ApiWarehouseResponse,
  InventoryRecord,
  NoShippingCodeFilter,
  NotPrintedFilter,
  PreparationQueuePagination,
  PreparationQueueSettings,
  PreparationQueueSummary,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SimpleOrder,
  SortBy,
  SortOrder,
  StageFilter,
  StageCounts,
  StatusConfig,
  StockFilter,
  WarehouseOption,
  ItemCountFilter,
} from "./types";

export interface ApiListResponse<T> {
  data?: T[];
}

export interface ApiCompanyResponse {
  data?: {
    settings?: {
      orderPreparation?: unknown;
    };
  };
}

export interface UsePreparationQueueDataParams {
  page: number;
  pageSize: PageSize;
  activeStage: StageFilter;
  selectedWarehouseId: string;
  stockFilter: StockFilter;
  shortageReasonFilter: ShortageReasonFilter;
  shortageFollowUpFilter: ShortageFollowUpFilter;
  shortageOwnerFilter: string;
  productFilter: string;
  productColorFilter: string;
  productSizeFilter: string;
  productIdFilter: string;
  variantIdFilter: string;
  itemCountFilter: ItemCountFilter;
  notPrintedFilter: NotPrintedFilter;
  noShippingCodeFilter: NoShippingCodeFilter;
  search: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  companyId?: string;
}

export interface ApiProductVariant {
  id: string;
  productId: string;
  name: string;
  type: string;
  sku?: string | null;
  price?: number | null;
  stock?: number;
  isActive?: boolean;
  metadata?: string | null;
}

export interface ApiProduct {
  id: string;
  name: string;
  images?: string | null;
  productVariants?: ApiProductVariant[];
  variants?: ApiProductVariant[];
}

export interface PreparationOrdersQueryData {
  orders: SimpleOrder[];
  pagination: PreparationQueuePagination;
  summary: PreparationQueueSummary;
  shortageOwnerOptions: string[];
}

export const EMPTY_STAGE_COUNTS: StageCounts = {
  ALL: 0,
  WAITING: 0,
  PREPARING: 0,
  QUALITY_CHECK: 0,
  PACKAGED: 0,
  READY_TO_SHIP: 0,
  STOCK_SHORTAGE: 0,
  PENDING_CANCELLATION: 0,
  ON_HOLD_PREP: 0,
};

export const EMPTY_PAGINATION: PreparationQueuePagination = {
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  pages: 1,
};

export const EMPTY_SUMMARY: PreparationQueueSummary = {
  filteredTotal: 0,
  visibleTotal: 0,
  stageCounts: EMPTY_STAGE_COUNTS,
  readyCount: 0,
  shortageCount: 0,
  shortageHoldCount: 0,
  onHoldPrepCount: 0,
  overdueShortageFollowUpCount: 0,
  overdueProblemFollowUpCount: 0,
  readyToShipCount: 0,
  allOverdueShortageFollowUpCount: 0,
  allOverdueProblemFollowUpCount: 0,
};

export const PREPARATION_QUERY_KEYS = {
  inventory: (cid = "default") => ["preparation-queue", cid, "inventory"] as const,
  warehouses: (cid = "default") => ["preparation-queue", cid, "warehouses"] as const,
  statuses: (cid = "default") => ["preparation-queue", cid, "statuses"] as const,
  settings: (cid = "default") => ["preparation-queue", cid, "settings"] as const,
  products: (cid = "default") => ["preparation-queue", cid, "products"] as const,
};

export const buildOrdersQueryKey = (
  params: UsePreparationQueueDataParams,
  prioritizeShortageOrders: boolean,
) =>
  [
    "preparation-queue",
    params.companyId || "default",
    "orders",
    params.page,
    params.pageSize,
    params.activeStage,
    params.selectedWarehouseId || "",
    params.stockFilter,
    params.shortageReasonFilter,
    params.shortageFollowUpFilter,
    (params.shortageOwnerFilter || "").trim().toLowerCase(),
    (params.productFilter || "").trim().toLowerCase(),
    (params.productColorFilter || "").trim().toLowerCase(),
    (params.productSizeFilter || "").trim().toLowerCase(),
    (params.productIdFilter || "").trim(),
    (params.variantIdFilter || "").trim(),
    params.itemCountFilter,
    params.notPrintedFilter,
    params.noShippingCodeFilter,
    (params.search || "").trim().toLowerCase(),
    prioritizeShortageOrders ? "prioritized" : "chronological",
    params.sortBy,
    params.sortOrder,
  ] as const;

export const fetchOrdersData = async (
  params: UsePreparationQueueDataParams,
  prioritizeShortageOrders: boolean,
): Promise<PreparationOrdersQueryData> => {
  const response = await apiClient.get<ApiPreparationOrdersResponse>(
    "/orders-new/preparation/queue",
    {
      params: {
        page: params.page,
        limit: params.pageSize,
        stage: params.activeStage,
        warehouseId: params.selectedWarehouseId || undefined,
        stockFilter: params.stockFilter,
        shortageReason: params.shortageReasonFilter,
        shortageFollowUp: params.shortageFollowUpFilter,
        shortageOwner: (params.shortageOwnerFilter || "").trim() || undefined,
        productFilter: (params.productFilter || "").trim() || undefined,
        colorFilter: (params.productColorFilter || "").trim() || undefined,
        sizeFilter: (params.productSizeFilter || "").trim() || undefined,
        productId: (params.productIdFilter || "").trim() || undefined,
        variantId: (params.variantIdFilter || "").trim() || undefined,
        itemCountFilter: params.itemCountFilter,
        notPrinted: params.notPrintedFilter === "not_printed" || undefined,
        noShippingCode: params.noShippingCodeFilter === "no_shipping_code" || undefined,
        search: (params.search || "").trim() || undefined,
        prioritizeShortageOrders,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    },
  );

  const payload = Array.isArray(response.data?.data) ? response.data.data : [];
  const pagination = response.data?.pagination;
  const summary = response.data?.summary;

  return {
    orders: payload
      .filter((o: { status?: string }) => {
        const status = (o.status || "").toUpperCase().trim();
        return !TERMINAL_NON_PREPARATION_STATUSES.has(status);
      })
      .map(normalizeSimpleOrder),
    pagination: {
      total: Number(pagination?.total || 0),
      page: Number(pagination?.page || params.page || 1),
      limit: Number(pagination?.limit || PAGE_SIZE),
      pages: Math.max(1, Number(pagination?.pages || 1)),
    },
    summary: {
      filteredTotal: Number(summary?.filteredTotal || 0),
      visibleTotal: Number(summary?.visibleTotal || 0),
      stageCounts: {
        ...EMPTY_STAGE_COUNTS,
        ...(summary?.stageCounts || {}),
      },
      statusCounts: { ...(summary?.statusCounts || {}) },
      readyCount: Number(summary?.readyCount || 0),
      shortageCount: Number(summary?.shortageCount || 0),
      shortageHoldCount: Number(summary?.shortageHoldCount || 0),
      onHoldPrepCount: Number(summary?.onHoldPrepCount || 0),
      overdueShortageFollowUpCount: Number(
        summary?.overdueShortageFollowUpCount || 0,
      ),
      overdueProblemFollowUpCount: Number(
        summary?.overdueProblemFollowUpCount || 0,
      ),
      readyToShipCount: Number(summary?.readyToShipCount || 0),
      allOverdueShortageFollowUpCount: Number(
        summary?.allOverdueShortageFollowUpCount || 0,
      ),
      allOverdueProblemFollowUpCount: Number(
        summary?.allOverdueProblemFollowUpCount || 0,
      ),
    },
    shortageOwnerOptions: Array.isArray(response.data?.shortageOwnerOptions)
      ? response.data.shortageOwnerOptions
      : [],
  };
};

export const fetchInventoryData = async (
  productIds: string[],
): Promise<InventoryRecord[]> => {
  if (productIds.length === 0) return [];

  const response = await apiClient.get<ApiListResponse<ApiInventoryResponse>>(
    "/inventory",
    {
      params: { productIds: productIds.join(",") },
    },
  );
  const payload = Array.isArray(response.data?.data) ? response.data.data : [];

  return payload.map(normalizeInventoryRecord);
};

export const fetchWarehousesData = async (): Promise<WarehouseOption[]> => {
  const response =
    await apiClient.get<ApiListResponse<ApiWarehouseResponse>>("/warehouses");
  const payload = Array.isArray(response.data?.data) ? response.data.data : [];

  return payload.map(normalizeWarehouseOption);
};

export const fetchStatusConfigsData = async (): Promise<StatusConfig[]> => {
  try {
    const [preparationRes, shippingRes] = await Promise.all([
      apiClient.get<ApiListResponse<ApiStatusResponse>>(
        "/order-status?statusType=preparation",
        { _skipErrorToast: true },
      ),
      apiClient.get<ApiListResponse<ApiStatusResponse>>(
        "/order-status?statusType=shipping",
        { _skipErrorToast: true },
      ),
    ]);

    const preparation = Array.isArray(preparationRes.data?.data)
      ? preparationRes.data.data
      : [];
    const shipping = Array.isArray(shippingRes.data?.data)
      ? shippingRes.data.data
      : [];

    return [...preparation, ...shipping]
      .map(normalizeStatusConfig)
      .filter((status): status is StatusConfig => Boolean(status));
  } catch {
    return [];
  }
};

export const fetchPreparationSettingsData = async (): Promise<PreparationQueueSettings> => {
  try {
    const response = await apiClient.get<ApiCompanyResponse>("/companies/current");
    const rawSettings = response.data?.data?.settings?.orderPreparation;
    return normalizePreparationQueueSettings(rawSettings);
  } catch (error) {
    console.warn("Failed to load preparation settings:", error);
    return DEFAULT_PREPARATION_QUEUE_SETTINGS;
  }
};

export const fetchProductsData = async (): Promise<ApiProduct[]> => {
  try {
    const response = await apiClient.get<ApiListResponse<ApiProduct>>("/products", {
      params: { limit: 200 },
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.warn("Failed to load products:", error);
    return [];
  }
};
