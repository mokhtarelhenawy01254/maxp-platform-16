import type { Order } from "../Orders";
import type { OrdersFilters } from "../ordersFilterTypes";
import { useOrdersFilterActions } from "./useOrdersFilterActions";
import { useOrdersBulkOperations } from "./useOrdersBulkOperations";
import { useOrdersSingleMutations } from "./useOrdersSingleMutations";

export interface UseOrdersOperationsOptions {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  filters: OrdersFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrdersFilters>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  selectedOrders: string[];
  setSelectedOrders: (orders: string[]) => void;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  isTrashView?: boolean;
  fetchOrders: () => void;
  user: any;
  navigate: (path: string) => void;
  t: (key: string, options?: any) => string;
  getStatusDisplay: (status: string) => any;
  normalizeStatusCode: (status?: string | null) => string;
  isCancellationStatus: (status?: string | null) => boolean;
  getApiErrorMessage: (error: any, fallback: string) => string;
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
}

export function useOrdersOperations({
  orders,
  setOrders,
  filters,
  setFilters,
  page,
  setPage,
  totalPages,
  limit,
  setLimit,
  selectedOrders,
  setSelectedOrders,
  setShowAdvancedFilters,
  isTrashView,
  fetchOrders,
  user,
  navigate,
  t,
  getStatusDisplay,
  normalizeStatusCode,
  isCancellationStatus,
  getApiErrorMessage,
  selectedOrder,
  setSelectedOrder,
}: UseOrdersOperationsOptions) {
  const filterActions = useOrdersFilterActions({
    orders,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    limit,
    setLimit,
    selectedOrders,
    setSelectedOrders,
    setShowAdvancedFilters,
  });

  const bulkOperations = useOrdersBulkOperations({
    selectedOrders,
    setSelectedOrders,
    isTrashView,
    fetchOrders,
    user,
    navigate,
    t,
    getStatusDisplay,
    normalizeStatusCode,
    isCancellationStatus,
    getApiErrorMessage,
  });

  const singleMutations = useOrdersSingleMutations({
    orders,
    setOrders,
    selectedOrder,
    setSelectedOrder,
    normalizeStatusCode,
    isCancellationStatus,
    getApiErrorMessage,
    t,
  });

  return {
    ...filterActions,
    ...bulkOperations,
    ...singleMutations,
  };
}

export type UseOrdersOperationsReturn = ReturnType<typeof useOrdersOperations>;
