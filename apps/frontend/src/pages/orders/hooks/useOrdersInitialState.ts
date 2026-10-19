import { useMemo, useRef, useState, useEffect } from "react";
import { queryClient } from "../../../config/queryClient";
import {
  type OrdersFilters,
  type OrdersListViewState,
  getInitialOrdersListViewState,
} from "../ordersFilterTypes";
import type { Order } from "../Orders";

export interface UseOrdersInitialStateOptions {
  searchParams: URLSearchParams;
  companyId: string;
  userRole?: string;
}

export function useOrdersInitialState({
  searchParams,
  companyId,
  userRole,
}: UseOrdersInitialStateOptions) {
  const initialListViewState = useRef<OrdersListViewState | null>(null);
  if (!initialListViewState.current) {
    initialListViewState.current = getInitialOrdersListViewState(searchParams);
  }
  const restoredListViewState = initialListViewState.current!;

  const initialCacheKey = useMemo(
    () => [
      "orders-page-cache",
      companyId,
      restoredListViewState.page,
      restoredListViewState.limit,
      { ...restoredListViewState.filters, search: restoredListViewState.filters.search },
    ],
    [companyId, restoredListViewState],
  );

  const initialCachedData = queryClient.getQueryData<{
    orders: Order[];
    totalPages: number;
    totalOrders: number;
  }>(initialCacheKey);

  const [orders, setOrders] = useState<Order[]>(() => initialCachedData?.orders || []);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const [loading, setLoading] = useState(() => !initialCachedData?.orders?.length);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);

  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    userRole || "",
  );
  const isMerchant = userRole === "MERCHANT";
  const canSelectOrders = isAdmin && !isMerchant;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [page, setPage] = useState(restoredListViewState.page);
  const [limit, setLimit] = useState(restoredListViewState.limit);
  const [totalOrders, setTotalOrders] = useState(() => initialCachedData?.totalOrders || 0);
  const [totalPages, setTotalPages] = useState(() => initialCachedData?.totalPages || 0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<OrdersFilters>(
    restoredListViewState.filters,
  );

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const effectiveFilters = useMemo<OrdersFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const filtersRef = useRef<OrdersFilters>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [showIncompleteInOrders, setShowIncompleteInOrders] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  return {
    orders,
    setOrders,
    ordersRef,
    loading,
    setLoading,
    ordersLoadError,
    setOrdersLoadError,
    isAdmin,
    isMerchant,
    canSelectOrders,
    selectedOrder,
    setSelectedOrder,
    showOrderModal,
    setShowOrderModal,
    page,
    setPage,
    limit,
    setLimit,
    totalOrders,
    setTotalOrders,
    totalPages,
    setTotalPages,
    selectedOrders,
    setSelectedOrders,
    showAdvancedFilters,
    setShowAdvancedFilters,
    filters,
    setFilters,
    debouncedSearch,
    effectiveFilters,
    filtersRef,
    showIncompleteInOrders,
    setShowIncompleteInOrders,
    lastUpdatedAt,
    setLastUpdatedAt,
  };
}
