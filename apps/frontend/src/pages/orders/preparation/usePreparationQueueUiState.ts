import { useMemo, useReducer } from "react";
import type { PageSize } from "./constants";
import type {
  NoShippingCodeFilter,
  NotPrintedFilter,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SortBy,
  SortOrder,
  StageFilter,
  StockFilter,
  ItemCountFilter,
} from "./types";

export interface PreparationQueueUiState {
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
  page: number;
  pageSize: PageSize;
  selectedOrders: string[];
  statusSelections: Record<string, string>;
  bulkStatus: string;
}

type PreparationQueueUiAction =
  | { type: "set_active_stage"; value: StageFilter }
  | { type: "apply_default_warehouse"; value: string }
  | { type: "set_selected_warehouse"; value: string }
  | { type: "set_stock_filter"; value: StockFilter }
  | { type: "set_shortage_reason_filter"; value: ShortageReasonFilter }
  | { type: "set_shortage_follow_up_filter"; value: ShortageFollowUpFilter }
  | { type: "set_shortage_owner_filter"; value: string }
  | { type: "set_product_filter"; value: string }
  | { type: "set_product_color_filter"; value: string }
  | { type: "set_product_size_filter"; value: string }
  | { type: "set_product_id_filter"; value: string }
  | { type: "set_variant_id_filter"; value: string }
  | { type: "set_item_count_filter"; value: ItemCountFilter }
  | { type: "set_not_printed_filter"; value: NotPrintedFilter }
  | { type: "set_no_shipping_code_filter"; value: NoShippingCodeFilter }
  | { type: "set_search"; value: string }
  | { type: "set_sort"; value: { sortBy: SortBy; sortOrder: SortOrder } }
  | { type: "set_page_size"; value: PageSize }
  | { type: "reset_page" }
  | { type: "clamp_page"; totalPages: number }
  | { type: "go_to_previous_page" }
  | { type: "go_to_next_page"; totalPages: number }
  | { type: "retain_selected_orders"; visibleOrderNumbers: string[] }
  | { type: "toggle_order_selection"; orderNumber: string }
  | { type: "clear_visible_selection"; orderNumbers: string[] }
  | { type: "select_visible_orders"; orderNumbers: string[] }
  | { type: "set_status_selection"; orderNumber: string; value: string }
  | { type: "set_bulk_status"; value: string }
  | { type: "clear_bulk_controls" };

const initialState: PreparationQueueUiState = {
  activeStage: "ALL",
  selectedWarehouseId: "",
  stockFilter: "all",
  shortageReasonFilter: "all",
  shortageFollowUpFilter: "all",
  shortageOwnerFilter: "",
  productFilter: "",
  productColorFilter: "",
  productSizeFilter: "",
  productIdFilter: "",
  variantIdFilter: "",
  itemCountFilter: "all",
  notPrintedFilter: "all",
  noShippingCodeFilter: "all",
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 12,
  selectedOrders: [],
  statusSelections: {},
  bulkStatus: "",
};

const withPageReset = (
  state: PreparationQueueUiState,
  patch: Partial<PreparationQueueUiState>,
): PreparationQueueUiState => ({
  ...state,
  ...patch,
  page: 1,
});

const preparationQueueUiReducer = (
  state: PreparationQueueUiState,
  action: PreparationQueueUiAction,
): PreparationQueueUiState => {
  switch (action.type) {
    case "set_active_stage":
      return withPageReset(state, {
        activeStage: action.value,
        selectedOrders: [],
        statusSelections: {},
        bulkStatus: "",
      });
    case "apply_default_warehouse":
      if (state.selectedWarehouseId || !action.value) {
        return state;
      }

      return withPageReset(state, { selectedWarehouseId: action.value });
    case "set_selected_warehouse":
      return withPageReset(state, { selectedWarehouseId: action.value });
    case "set_stock_filter":
      return withPageReset(state, { stockFilter: action.value });
    case "set_shortage_reason_filter":
      return withPageReset(state, { shortageReasonFilter: action.value });
    case "set_shortage_follow_up_filter":
      return withPageReset(state, { shortageFollowUpFilter: action.value });
    case "set_shortage_owner_filter":
      return withPageReset(state, { shortageOwnerFilter: action.value });
    case "set_product_filter":
      return withPageReset(state, { productFilter: action.value });
    case "set_product_color_filter":
      return withPageReset(state, { productColorFilter: action.value });
    case "set_product_size_filter":
      return withPageReset(state, { productSizeFilter: action.value });
    case "set_product_id_filter":
      return withPageReset(state, { productIdFilter: action.value, variantIdFilter: "" });
    case "set_variant_id_filter":
      return withPageReset(state, { variantIdFilter: action.value });
    case "set_item_count_filter":
      return withPageReset(state, { itemCountFilter: action.value });
    case "set_not_printed_filter":
      return withPageReset(state, { notPrintedFilter: action.value });
    case "set_no_shipping_code_filter":
      return withPageReset(state, { noShippingCodeFilter: action.value });
    case "set_search":
      return withPageReset(state, { search: action.value });
    case "set_sort":
      return withPageReset(state, {
        sortBy: action.value.sortBy,
        sortOrder: action.value.sortOrder,
      });
    case "set_page_size":
      return withPageReset(state, { pageSize: action.value });
    case "reset_page":
      return {
        ...state,
        page: 1,
      };
    case "clamp_page":
      return {
        ...state,
        page: Math.min(state.page, Math.max(1, action.totalPages)),
      };
    case "go_to_previous_page":
      return {
        ...state,
        page: Math.max(1, state.page - 1),
      };
    case "go_to_next_page":
      if (state.page >= action.totalPages) return state;
      return {
        ...state,
        page: state.page + 1,
      };
    case "retain_selected_orders": {
      const visibleSet = new Set(action.visibleOrderNumbers);
      return {
        ...state,
        selectedOrders: state.selectedOrders.filter((orderNumber) =>
          visibleSet.has(orderNumber),
        ),
      };
    }
    case "toggle_order_selection":
      return {
        ...state,
        selectedOrders: state.selectedOrders.includes(action.orderNumber)
          ? state.selectedOrders.filter((item) => item !== action.orderNumber)
          : [...state.selectedOrders, action.orderNumber],
      };
    case "clear_visible_selection": {
      const orderNumbersSet = new Set(action.orderNumbers);
      return {
        ...state,
        selectedOrders: state.selectedOrders.filter(
          (orderNumber) => !orderNumbersSet.has(orderNumber),
        ),
      };
    }
    case "select_visible_orders":
      return {
        ...state,
        selectedOrders: Array.from(
          new Set([...state.selectedOrders, ...action.orderNumbers]),
        ),
      };
    case "set_status_selection":
      return {
        ...state,
        statusSelections: {
          ...state.statusSelections,
          [action.orderNumber]: action.value,
        },
      };
    case "set_bulk_status":
      return {
        ...state,
        bulkStatus: action.value,
      };
    case "clear_bulk_controls":
      return {
        ...state,
        selectedOrders: [],
        bulkStatus: "",
      };
    default:
      return state;
  }
};

export const usePreparationQueueUiState = (
  overrides?: Partial<PreparationQueueUiState>,
) => {
  const [state, dispatch] = useReducer(preparationQueueUiReducer, {
    ...initialState,
    ...overrides,
  });

  const actions = useMemo(
    () => ({
      setActiveStage: (value: StageFilter) =>
        dispatch({ type: "set_active_stage", value }),
      applyDefaultWarehouse: (value: string) =>
        dispatch({ type: "apply_default_warehouse", value }),
      setSelectedWarehouse: (value: string) =>
        dispatch({ type: "set_selected_warehouse", value }),
      setStockFilter: (value: StockFilter) =>
        dispatch({ type: "set_stock_filter", value }),
      setShortageReasonFilter: (value: ShortageReasonFilter) =>
        dispatch({ type: "set_shortage_reason_filter", value }),
      setShortageFollowUpFilter: (value: ShortageFollowUpFilter) =>
        dispatch({ type: "set_shortage_follow_up_filter", value }),
      setShortageOwnerFilter: (value: string) =>
        dispatch({ type: "set_shortage_owner_filter", value }),
      setProductFilter: (value: string) =>
        dispatch({ type: "set_product_filter", value }),
      setProductColorFilter: (value: string) =>
        dispatch({ type: "set_product_color_filter", value }),
      setProductSizeFilter: (value: string) =>
        dispatch({ type: "set_product_size_filter", value }),
      setProductIdFilter: (value: string) =>
        dispatch({ type: "set_product_id_filter", value }),
      setVariantIdFilter: (value: string) =>
        dispatch({ type: "set_variant_id_filter", value }),
      setItemCountFilter: (value: ItemCountFilter) =>
        dispatch({ type: "set_item_count_filter", value }),
      setNotPrintedFilter: (value: NotPrintedFilter) =>
        dispatch({ type: "set_not_printed_filter", value }),
      setNoShippingCodeFilter: (value: NoShippingCodeFilter) =>
        dispatch({ type: "set_no_shipping_code_filter", value }),
      setSearch: (value: string) => dispatch({ type: "set_search", value }),
      setSort: (value: { sortBy: SortBy; sortOrder: SortOrder }) =>
        dispatch({ type: "set_sort", value }),
      setPageSize: (value: PageSize) =>
        dispatch({ type: "set_page_size", value }),
      clampPage: (totalPages: number) =>
        dispatch({ type: "clamp_page", totalPages }),
      goToPreviousPage: () => dispatch({ type: "go_to_previous_page" }),
      goToNextPage: (totalPages: number) =>
        dispatch({ type: "go_to_next_page", totalPages }),
      retainSelectedOrders: (visibleOrderNumbers: string[]) =>
        dispatch({ type: "retain_selected_orders", visibleOrderNumbers }),
      toggleOrderSelection: (orderNumber: string) =>
        dispatch({ type: "toggle_order_selection", orderNumber }),
      clearVisibleSelection: (orderNumbers: string[]) =>
        dispatch({ type: "clear_visible_selection", orderNumbers }),
      selectVisibleOrders: (orderNumbers: string[]) =>
        dispatch({ type: "select_visible_orders", orderNumbers }),
      setStatusSelection: (orderNumber: string, value: string) =>
        dispatch({ type: "set_status_selection", orderNumber, value }),
      setBulkStatus: (value: string) =>
        dispatch({ type: "set_bulk_status", value }),
      clearBulkControls: () => dispatch({ type: "clear_bulk_controls" }),
    }),
    [],
  );

  return { state, actions };
};
