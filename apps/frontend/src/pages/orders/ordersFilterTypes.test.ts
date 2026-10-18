import {
  DEFAULT_ORDERS_FILTERS,
  ORDERS_LIST_STORAGE_KEY,
  ORDERS_LIST_QUERY_KEYS,
  parsePositiveInt,
  parseMultiFilterParam,
  getFiltersFromSearchParams,
  sanitizeStoredFilters,
  readStoredOrdersListViewState,
  hasOrdersQueryState,
  getInitialOrdersListViewState,
} from "./ordersFilterTypes";

describe("ordersFilterTypes helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    if ((localStorage.getItem as any)?.mockReturnValue) {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
    }
  });

  describe("parsePositiveInt", () => {
    it("returns positive integer when valid", () => {
      expect(parsePositiveInt("5", 1)).toBe(5);
      expect(parsePositiveInt(10, 1)).toBe(10);
    });

    it("returns fallback for invalid or non-positive values", () => {
      expect(parsePositiveInt("-3", 1)).toBe(1);
      expect(parsePositiveInt("0", 20)).toBe(20);
      expect(parsePositiveInt("invalid", 10)).toBe(10);
      expect(parsePositiveInt(null, 15)).toBe(15);
    });
  });

  describe("parseMultiFilterParam", () => {
    it("parses comma separated values", () => {
      expect(parseMultiFilterParam("CONFIRMED,DELIVERED")).toEqual([
        "CONFIRMED",
        "DELIVERED",
      ]);
    });

    it("trims and filters empty values", () => {
      expect(parseMultiFilterParam(" A , , B ")).toEqual(["A", "B"]);
    });

    it("returns empty array for null/empty", () => {
      expect(parseMultiFilterParam(null)).toEqual([]);
      expect(parseMultiFilterParam("")).toEqual([]);
    });
  });

  describe("getFiltersFromSearchParams", () => {
    it("parses params correctly", () => {
      const params = new URLSearchParams(
        "status=PENDING,SHIPPED&search=Ahmed&onlyUnseen=true&page=2"
      );
      const filters = getFiltersFromSearchParams(params);
      expect(filters.status).toEqual(["PENDING", "SHIPPED"]);
      expect(filters.search).toBe("Ahmed");
      expect(filters.onlyUnseen).toBe(true);
      expect(filters.onlyPostPurchaseOffer).toBe(false);
    });
  });

  describe("sanitizeStoredFilters", () => {
    it("falls back to defaults on corrupt/empty data", () => {
      const sanitized = sanitizeStoredFilters(null);
      expect(sanitized.status).toEqual([]);
      expect(sanitized.search).toBe("");
      expect(sanitized.onlyUnseen).toBe(false);
    });

    it("preserves valid array and boolean values", () => {
      const sanitized = sanitizeStoredFilters({
        status: ["DELIVERED"],
        search: "test",
        onlyUnseen: true,
      });
      expect(sanitized.status).toEqual(["DELIVERED"]);
      expect(sanitized.search).toBe("test");
      expect(sanitized.onlyUnseen).toBe(true);
    });
  });

  describe("readStoredOrdersListViewState & getInitialOrdersListViewState", () => {
    it("returns state from searchParams if query state present", () => {
      const params = new URLSearchParams("page=3&status=CANCELLED");
      const state = getInitialOrdersListViewState(params);
      expect(state.page).toBe(3);
      expect(state.filters.status).toEqual(["CANCELLED"]);
    });

    it("reads stored state from localStorage if no search params", () => {
      const stored = {
        page: 2,
        limit: 50,
        filters: { ...DEFAULT_ORDERS_FILTERS, search: "stored" },
      };
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(stored));

      const params = new URLSearchParams("");
      const state = getInitialOrdersListViewState(params);
      expect(state.page).toBe(1);
      expect(state.limit).toBe(50);
      expect(state.filters.search).toBe("stored");
    });

    it("falls back to default state when nothing stored or in url", () => {
      const params = new URLSearchParams("");
      const state = getInitialOrdersListViewState(params);
      expect(state.page).toBe(1);
      expect(state.limit).toBe(20);
      expect(state.filters).toEqual(DEFAULT_ORDERS_FILTERS);
    });
  });
});
