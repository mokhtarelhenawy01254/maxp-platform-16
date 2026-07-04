import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { DEFAULT_PREPARATION_QUEUE_SETTINGS, PAGE_SIZE } from "./constants";
import {
  normalizeInventoryRecord,
  normalizePreparationQueueSettings,
  normalizeSimpleOrder,
  normalizeStatusConfig,
  normalizeWarehouseOption,
} from "./normalizers";
import { getApiErrorMessage } from "./helpers";
import type {
  ApiInventoryResponse,
  ApiPreparationOrdersResponse,
  ApiStatusResponse,
  ApiWarehouseResponse,
  InventoryRecord,
  PreparationQueuePagination,
  PreparationQueueSettings,
  PreparationQueueSummary,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SimpleOrder,
  StageFilter,
  StageCounts,
  StatusConfig,
  StockFilter,
  WarehouseOption,
} from "./types";

interface ApiListResponse<T> {
  data?: T[];
}

interface ApiCompanyResponse {
  data?: {
    settings?: {
      orderPreparation?: unknown;
    };
  };
}

interface UsePreparationQueueDataParams {
  page: number;
  activeStage: StageFilter;
  selectedWarehouseId: string;
  stockFilter: StockFilter;
  shortageReasonFilter: ShortageReasonFilter;
  shortageFollowUpFilter: ShortageFollowUpFilter;
  shortageOwnerFilter: string;
  search: string;
}

interface UsePreparationQueueDataResult {
  orders: SimpleOrder[];
  setOrders: Dispatch<SetStateAction<SimpleOrder[]>>;
  inventory: InventoryRecord[];
  warehouses: WarehouseOption[];
  statusConfigs: StatusConfig[];
  preparationSettings: PreparationQueueSettings;
  pagination: PreparationQueuePagination;
  summary: PreparationQueueSummary;
  shortageOwnerOptions: string[];
  loading: boolean;
  refreshing: boolean;
  fetchInventory: () => Promise<void>;
  fetchAll: (showRefreshToast?: boolean) => Promise<void>;
}

interface PreparationOrdersQueryData {
  orders: SimpleOrder[];
  pagination: PreparationQueuePagination;
  summary: PreparationQueueSummary;
  shortageOwnerOptions: string[];
}

const EMPTY_STAGE_COUNTS: StageCounts = {
  ALL: 0,
  WAITING: 0,
  PREPARING: 0,
  QUALITY_CHECK: 0,
  PACKAGED: 0,
  READY_TO_SHIP: 0,
  STOCK_SHORTAGE: 0,
  PENDING_CANCELLATION: 0,
};

const EMPTY_PAGINATION: PreparationQueuePagination = {
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  pages: 1,
};

const EMPTY_SUMMARY: PreparationQueueSummary = {
  filteredTotal: 0,
  visibleTotal: 0,
  stageCounts: EMPTY_STAGE_COUNTS,
  readyCount: 0,
  shortageCount: 0,
  shortageHoldCount: 0,
  overdueShortageFollowUpCount: 0,
  readyToShipCount: 0,
  allOverdueShortageFollowUpCount: 0,
};

const PREPARATION_QUERY_KEYS = {
  inventory: ["preparation-queue", "inventory"] as const,
  warehouses: ["preparation-queue", "warehouses"] as const,
  statuses: ["preparation-queue", "statuses"] as const,
  settings: ["preparation-queue", "settings"] as const,
};

const buildOrdersQueryKey = (
  params: UsePreparationQueueDataParams,
  prioritizeShortageOrders: boolean,
) =>
  [
    "preparation-queue",
    "orders",
    params.page,
    params.activeStage,
    params.selectedWarehouseId || "",
    params.stockFilter,
    params.shortageReasonFilter,
    params.shortageFollowUpFilter,
    params.shortageOwnerFilter.trim().toLowerCase(),
    params.search.trim().toLowerCase(),
    prioritizeShortageOrders ? "prioritized" : "chronological",
  ] as const;

const fetchOrdersData = async (
  params: UsePreparationQueueDataParams,
  prioritizeShortageOrders: boolean,
): Promise<PreparationOrdersQueryData> => {
  const response = await apiClient.get<ApiPreparationOrdersResponse>(
    "/orders-new/preparation/queue",
    {
      params: {
        page: params.page,
        limit: PAGE_SIZE,
        stage: params.activeStage,
        warehouseId: params.selectedWarehouseId || undefined,
        stockFilter: params.stockFilter,
        shortageReason: params.shortageReasonFilter,
        shortageFollowUp: params.shortageFollowUpFilter,
        shortageOwner: params.shortageOwnerFilter.trim() || undefined,
        search: params.search.trim() || undefined,
        prioritizeShortageOrders,
      },
    },
  );

  const payload = Array.isArray(response.data?.data) ? response.data.data : [];
  const pagination = response.data?.pagination;
  const summary = response.data?.summary;

  return {
    orders: payload.map(normalizeSimpleOrder),
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
      readyCount: Number(summary?.readyCount || 0),
      shortageCount: Number(summary?.shortageCount || 0),
      shortageHoldCount: Number(summary?.shortageHoldCount || 0),
      overdueShortageFollowUpCount: Number(
        summary?.overdueShortageFollowUpCount || 0,
      ),
      readyToShipCount: Number(summary?.readyToShipCount || 0),
      allOverdueShortageFollowUpCount: Number(
        summary?.allOverdueShortageFollowUpCount || 0,
      ),
    },
    shortageOwnerOptions: Array.isArray(response.data?.shortageOwnerOptions)
      ? response.data.shortageOwnerOptions
      : [],
  };
};

const fetchInventoryData = async (): Promise<InventoryRecord[]> => {
  const response =
    await apiClient.get<ApiListResponse<ApiInventoryResponse>>("/inventory");
  const payload = Array.isArray(response.data?.data) ? response.data.data : [];

  return payload.map(normalizeInventoryRecord);
};

const fetchWarehousesData = async (): Promise<WarehouseOption[]> => {
  const response =
    await apiClient.get<ApiListResponse<ApiWarehouseResponse>>("/warehouses");
  const payload = Array.isArray(response.data?.data) ? response.data.data : [];

  return payload.map(normalizeWarehouseOption);
};

const fetchStatusConfigsData = async (): Promise<StatusConfig[]> => {
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
  } catch (_error) {
    return [];
  }
};

const fetchPreparationSettingsData =
  async (): Promise<PreparationQueueSettings> => {
    try {
      const response = await apiClient.get<ApiCompanyResponse>("/companies/current");
      const rawSettings = response.data?.data?.settings?.orderPreparation;
      return normalizePreparationQueueSettings(rawSettings);
    } catch (error) {
      console.warn("Failed to load preparation settings:", error);
      return DEFAULT_PREPARATION_QUEUE_SETTINGS;
    }
  };

export const usePreparationQueueData = ({
  page,
  activeStage,
  selectedWarehouseId,
  stockFilter,
  shortageReasonFilter,
  shortageFollowUpFilter,
  shortageOwnerFilter,
  search,
}: UsePreparationQueueDataParams): UsePreparationQueueDataResult => {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const preparationSettingsQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.settings,
    queryFn: fetchPreparationSettingsData,
  });

  const prioritizeShortageOrders =
    preparationSettingsQuery.data?.prioritizeShortageOrders ??
    DEFAULT_PREPARATION_QUEUE_SETTINGS.prioritizeShortageOrders;

  const ordersParams = useMemo<UsePreparationQueueDataParams>(
    () => ({
      page,
      activeStage,
      selectedWarehouseId,
      stockFilter,
      shortageReasonFilter,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      search,
    }),
    [
      activeStage,
      page,
      search,
      selectedWarehouseId,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      shortageReasonFilter,
      stockFilter,
    ],
  );

  const ordersQueryKey = useMemo(
    () => buildOrdersQueryKey(ordersParams, prioritizeShortageOrders),
    [ordersParams, prioritizeShortageOrders],
  );

  const setOrdersState = useCallback<Dispatch<SetStateAction<SimpleOrder[]>>>(
    (value) => {
      setOrders((previous) => {
        const nextOrders =
          typeof value === "function"
            ? (value as (previousState: SimpleOrder[]) => SimpleOrder[])(previous)
            : value;

        queryClient.setQueryData<PreparationOrdersQueryData | undefined>(
          ordersQueryKey,
          (current) =>
            current
              ? {
                  ...current,
                  orders: nextOrders,
                }
              : {
                  orders: nextOrders,
                  pagination: EMPTY_PAGINATION,
                  summary: EMPTY_SUMMARY,
                  shortageOwnerOptions: [],
                },
        );

        return nextOrders;
      });
    },
    [ordersQueryKey, queryClient],
  );

  const ordersQuery = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => fetchOrdersData(ordersParams, prioritizeShortageOrders),
    placeholderData: (previousData) => previousData,
  });

  const inventoryQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.inventory,
    queryFn: fetchInventoryData,
  });

  const warehousesQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.warehouses,
    queryFn: fetchWarehousesData,
  });

  const statusConfigsQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.statuses,
    queryFn: fetchStatusConfigsData,
  });

  useEffect(() => {
    if (typeof ordersQuery.data?.orders !== "undefined") {
      setOrders(ordersQuery.data.orders);
    }
  }, [ordersQuery.data?.orders]);

  const loading = useMemo(
    () =>
      [
        ordersQuery,
        inventoryQuery,
        warehousesQuery,
        statusConfigsQuery,
        preparationSettingsQuery,
      ].some((query) => query.isPending && typeof query.data === "undefined"),
    [
      inventoryQuery,
      ordersQuery,
      preparationSettingsQuery,
      statusConfigsQuery,
      warehousesQuery,
    ],
  );

  const refreshing = useMemo(
    () =>
      manualRefreshing ||
      [
        ordersQuery,
        inventoryQuery,
        warehousesQuery,
        statusConfigsQuery,
        preparationSettingsQuery,
      ].some((query) => query.isFetching && !query.isPending),
    [
      inventoryQuery,
      manualRefreshing,
      ordersQuery,
      preparationSettingsQuery,
      statusConfigsQuery,
      warehousesQuery,
    ],
  );

  const fetchInventory = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: PREPARATION_QUERY_KEYS.inventory,
      queryFn: fetchInventoryData,
      staleTime: 0,
    });
  }, [queryClient]);

  const fetchAll = useCallback(
    async (showRefreshToast = false) => {
      try {
        if (showRefreshToast) {
          setManualRefreshing(true);
        }

        const [nextOrders] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ordersQueryKey,
            queryFn: () => fetchOrdersData(ordersParams, prioritizeShortageOrders),
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.inventory,
            queryFn: fetchInventoryData,
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.warehouses,
            queryFn: fetchWarehousesData,
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.statuses,
            queryFn: fetchStatusConfigsData,
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.settings,
            queryFn: fetchPreparationSettingsData,
            staleTime: 0,
          }),
        ]);

        setOrdersState(nextOrders.orders);

        if (showRefreshToast) {
          toast.success("تم تحديث قائمة التجهيز");
        }
      } catch (error: unknown) {
        console.error("Failed to load preparation queue:", error);
        toast.error(
          getApiErrorMessage(error) || "تعذر تحميل بيانات تجهيز الطلبات",
        );
      } finally {
        setManualRefreshing(false);
      }
    },
    [
      ordersParams,
      ordersQueryKey,
      prioritizeShortageOrders,
      queryClient,
      setOrdersState,
    ],
  );

  return {
    orders,
    setOrders: setOrdersState,
    inventory: inventoryQuery.data || [],
    warehouses: warehousesQuery.data || [],
    statusConfigs: statusConfigsQuery.data || [],
    preparationSettings:
      preparationSettingsQuery.data || DEFAULT_PREPARATION_QUEUE_SETTINGS,
    pagination: ordersQuery.data?.pagination || EMPTY_PAGINATION,
    summary: ordersQuery.data?.summary || EMPTY_SUMMARY,
    shortageOwnerOptions: ordersQuery.data?.shortageOwnerOptions || [],
    loading,
    refreshing,
    fetchInventory,
    fetchAll,
  };
};
