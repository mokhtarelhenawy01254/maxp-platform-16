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
import i18n from "../../../i18n";
import { DEFAULT_PREPARATION_QUEUE_SETTINGS } from "./constants";
import { getApiErrorMessage } from "./helpers";
import type {
  InventoryRecord,
  PreparationQueuePagination,
  PreparationQueueSettings,
  PreparationQueueSummary,
  SimpleOrder,
  StatusConfig,
  WarehouseOption,
} from "./types";
import {
  type ApiProduct,
  type ApiProductVariant,
  type UsePreparationQueueDataParams,
  type PreparationOrdersQueryData,
  EMPTY_PAGINATION,
  EMPTY_SUMMARY,
  PREPARATION_QUERY_KEYS,
  buildOrdersQueryKey,
  fetchOrdersData,
  fetchInventoryData,
  fetchWarehousesData,
  fetchStatusConfigsData,
  fetchPreparationSettingsData,
  fetchProductsData,
} from "./preparationQueueQueries";
import { usePreparationQueueInventory } from "./usePreparationQueueInventory";

export type {
  ApiProduct,
  ApiProductVariant,
  UsePreparationQueueDataParams,
};

export interface UsePreparationQueueDataResult {
  orders: SimpleOrder[];
  setOrders: Dispatch<SetStateAction<SimpleOrder[]>>;
  inventory: InventoryRecord[];
  inventoryLoading: boolean;
  ensureInventory: () => Promise<void>;
  warehouses: WarehouseOption[];
  statusConfigs: StatusConfig[];
  preparationStatuses: StatusConfig[];
  preparationSettings: PreparationQueueSettings;
  pagination: PreparationQueuePagination;
  summary: PreparationQueueSummary;
  statusCounts: Record<string, number>;
  shortageOwnerOptions: string[];
  loading: boolean;
  refreshing: boolean;
  fetchInventory: () => Promise<InventoryRecord[]>;
  fetchAll: (showRefreshToast?: boolean) => Promise<void>;
  products: ApiProduct[];
  productsLoading: boolean;
}

export const usePreparationQueueData = (
  params: UsePreparationQueueDataParams,
): UsePreparationQueueDataResult => {
  const { companyId = "" } = params;
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const productIds = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId) ids.add(item.productId);
      });
    });
    return [...ids];
  }, [orders]);

  const {
    inventory,
    setInventory,
    inventoryLoading,
    ensureInventory,
    fetchInventory,
    fetchedProductIdsRef,
    resetInventoryCache,
  } = usePreparationQueueInventory({ companyId, productIds });

  // Clear orders and fetched refs on company switch event
  useEffect(() => {
    const handleCompanySwitched = () => {
      setOrders([]);
      resetInventoryCache();
    };
    window.addEventListener("company:switched", handleCompanySwitched);
    return () => window.removeEventListener("company:switched", handleCompanySwitched);
  }, [resetInventoryCache]);

  const preparationSettingsQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.settings(companyId),
    queryFn: fetchPreparationSettingsData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const productsQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.products(companyId),
    queryFn: fetchProductsData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const prioritizeShortageOrders =
    preparationSettingsQuery.data?.prioritizeShortageOrders ??
    DEFAULT_PREPARATION_QUEUE_SETTINGS.prioritizeShortageOrders;

  const ordersQueryKey = useMemo(
    () => buildOrdersQueryKey(params, prioritizeShortageOrders),
    [params, prioritizeShortageOrders],
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
    queryFn: () => fetchOrdersData(params, prioritizeShortageOrders),
    placeholderData: (previousData) => previousData,
  });

  const warehousesQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.warehouses(companyId),
    queryFn: fetchWarehousesData,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const statusConfigsQuery = useQuery({
    queryKey: PREPARATION_QUERY_KEYS.statuses(companyId),
    queryFn: fetchStatusConfigsData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof ordersQuery.data?.orders !== "undefined") {
      setOrders(ordersQuery.data.orders);
    }
  }, [ordersQuery.data?.orders]);

  const loading = useMemo(
    () =>
      [ordersQuery, preparationSettingsQuery].some(
        (query) => query.isPending && typeof query.data === "undefined",
      ),
    [ordersQuery, preparationSettingsQuery],
  );

  const refreshing = useMemo(
    () =>
      manualRefreshing ||
      [
        ordersQuery,
        warehousesQuery,
        statusConfigsQuery,
        preparationSettingsQuery,
      ].some((query) => query.isFetching && !query.isPending),
    [
      manualRefreshing,
      ordersQuery,
      preparationSettingsQuery,
      statusConfigsQuery,
      warehousesQuery,
    ],
  );

  const fetchAll = useCallback(
    async (showRefreshToast = false) => {
      try {
        if (showRefreshToast) {
          setManualRefreshing(true);
        }

        const [freshOrders] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ordersQueryKey,
            queryFn: () => fetchOrdersData(params, prioritizeShortageOrders),
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.warehouses(companyId),
            queryFn: fetchWarehousesData,
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.statuses(companyId),
            queryFn: fetchStatusConfigsData,
            staleTime: 0,
          }),
          queryClient.fetchQuery({
            queryKey: PREPARATION_QUERY_KEYS.settings(companyId),
            queryFn: fetchPreparationSettingsData,
            staleTime: 0,
          }),
        ]);

        setOrdersState(freshOrders.orders);

        const freshProductIds: string[] = [];
        const seen = new Set<string>();
        freshOrders.orders.forEach((order) => {
          order.items.forEach((item) => {
            if (item.productId && !seen.has(item.productId)) {
              seen.add(item.productId);
              freshProductIds.push(item.productId);
            }
          });
        });

        const freshInv = await queryClient.fetchQuery({
          queryKey: [
            ...PREPARATION_QUERY_KEYS.inventory(companyId),
            ...freshProductIds,
          ],
          queryFn: () => fetchInventoryData(freshProductIds),
          staleTime: 0,
        });
        setInventory(freshInv || []);
        fetchedProductIdsRef.current = freshProductIds.sort().join(",");

        if (showRefreshToast) {
          toast.success(i18n.t("preparation.toasts.queueUpdated"));
        }
      } catch (error: unknown) {
        console.error("Failed to load preparation queue:", error);
        toast.error(
          getApiErrorMessage(error) ||
            i18n.t("preparation.toasts.queueLoadError"),
        );
      } finally {
        setManualRefreshing(false);
      }
    },
    [
      params,
      ordersQueryKey,
      prioritizeShortageOrders,
      queryClient,
      setOrdersState,
      companyId,
      setInventory,
      fetchedProductIdsRef,
    ],
  );

  const statusConfigsData = useMemo(
    () => statusConfigsQuery.data || [],
    [statusConfigsQuery.data],
  );

  const preparationStatuses = useMemo(
    () => statusConfigsData.filter((s) => s.statusType === "preparation"),
    [statusConfigsData],
  );

  const statusCounts = ordersQuery.data?.summary?.statusCounts || {};

  return {
    orders,
    setOrders: setOrdersState,
    inventory,
    inventoryLoading,
    ensureInventory,
    warehouses: warehousesQuery.data || [],
    statusConfigs: statusConfigsData,
    preparationStatuses,
    preparationSettings:
      preparationSettingsQuery.data || DEFAULT_PREPARATION_QUEUE_SETTINGS,
    pagination: ordersQuery.data?.pagination || EMPTY_PAGINATION,
    summary: ordersQuery.data?.summary || EMPTY_SUMMARY,
    statusCounts,
    shortageOwnerOptions: ordersQuery.data?.shortageOwnerOptions || [],
    loading,
    refreshing,
    fetchInventory,
    fetchAll,
    products: productsQuery.data || [],
    productsLoading: productsQuery.isLoading,
  };
};
