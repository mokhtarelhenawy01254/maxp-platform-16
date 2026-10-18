import { renderHook, act } from "@testing-library/react";
import {
  usePreparationUrlSync,
  parsePositiveInt,
  readStoredPreparationState,
  getInitialPreparationState,
  PREPARATION_STORAGE_KEY,
} from "./usePreparationUrlSync";
import type { PreparationQueueUiState, PreparationQueueUiActions } from "./usePreparationQueueUiState";

describe("usePreparationUrlSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parsePositiveInt", () => {
    it("parses valid positive integers correctly", () => {
      expect(parsePositiveInt("5", 1)).toBe(5);
      expect(parsePositiveInt(10, 1)).toBe(10);
    });

    it("falls back for non-positive or invalid inputs", () => {
      expect(parsePositiveInt("abc", 1)).toBe(1);
      expect(parsePositiveInt("-5", 1)).toBe(1);
      expect(parsePositiveInt(0, 1)).toBe(1);
      expect(parsePositiveInt(null, 10)).toBe(10);
    });
  });

  describe("getInitialPreparationState", () => {
    it("reads query parameters when present in searchParams", () => {
      const searchParams = new URLSearchParams("activeStage=WAITING_PRINT&page=2&pageSize=24");
      const state = getInitialPreparationState(searchParams);

      expect(state.activeStage).toBe("WAITING_PRINT");
      expect(state.page).toBe(2);
      expect(state.pageSize).toBe(24);
    });

    it("reads from localStorage when no query keys are in searchParams", () => {
      const stored = { activeStage: "STOCK_SHORTAGE", pageSize: 50 };
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(stored));

      const searchParams = new URLSearchParams("");
      const state = getInitialPreparationState(searchParams);

      expect(state.activeStage).toBe("STOCK_SHORTAGE");
      expect(state.pageSize).toBe(50);
    });

    it("returns empty object when neither query keys nor storage exist", () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

      const searchParams = new URLSearchParams("");
      const state = getInitialPreparationState(searchParams);

      expect(state).toEqual({});
    });
  });

  describe("hook synchronization", () => {
    const mockUiState: PreparationQueueUiState = {
      page: 1,
      pageSize: 12,
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
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      notPrintedFilter: "all",
      noShippingCodeFilter: "all",
      statusSelections: {},
      selectedOrders: [],
      bulkStatus: "",
    };

    const mockUiActions: PreparationQueueUiActions = {
      setPage: jest.fn(),
      setPageSize: jest.fn(),
      setActiveStage: jest.fn(),
      setSelectedWarehouse: jest.fn(),
      setStockFilter: jest.fn(),
      setShortageReasonFilter: jest.fn(),
      setShortageFollowUpFilter: jest.fn(),
      setShortageOwnerFilter: jest.fn(),
      setProductFilter: jest.fn(),
      setProductColorFilter: jest.fn(),
      setProductSizeFilter: jest.fn(),
      setProductIdFilter: jest.fn(),
      setVariantIdFilter: jest.fn(),
      setItemCountFilter: jest.fn(),
      setSearch: jest.fn(),
      setSort: jest.fn(),
      setNotPrintedFilter: jest.fn(),
      setNoShippingCodeFilter: jest.fn(),
      setStatusSelection: jest.fn(),
      setBulkStatus: jest.fn(),
      clearBulkControls: jest.fn(),
      toggleOrderSelection: jest.fn(),
      selectAllVisible: jest.fn(),
      clearSelection: jest.fn(),
      goToPreviousPage: jest.fn(),
      goToNextPage: jest.fn(),
    };

    it("syncs state changes to window.localStorage", () => {
      const searchParams = new URLSearchParams("");
      const setSearchParams = jest.fn();

      renderHook(() =>
        usePreparationUrlSync({
          uiState: mockUiState,
          uiActions: mockUiActions,
          searchParams,
          setSearchParams,
        }),
      );

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        PREPARATION_STORAGE_KEY,
        expect.stringContaining('"activeStage":"ALL"'),
      );
    });
  });
});
