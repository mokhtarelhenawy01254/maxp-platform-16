export interface OrdersFilters {
  status: string[];
  paymentStatus: string[];
  sourceType: string[];
  merchantId: string[];
  affiliateId: string[];
  fulfillmentSource: string[];
  merchantOperationStatus: string[];
  merchantSettlementStatus: string[];
  search: string;
  startDate: string;
  endDate: string;
  extractionMethod: string;
  minConfidence: string;
  onlyUnseen: boolean;
  timeRange: string;
  onlyPostPurchaseOffer: boolean;
}

export interface OrdersListViewState {
  page: number;
  limit: number;
  filters: OrdersFilters;
}

export const ORDERS_LIST_STORAGE_KEY = "orders:list:view-state:v1";

export const DEFAULT_ORDERS_FILTERS: OrdersFilters = {
  status: [],
  paymentStatus: [],
  sourceType: [],
  merchantId: [],
  affiliateId: [],
  fulfillmentSource: [],
  merchantOperationStatus: [],
  merchantSettlementStatus: [],
  search: "",
  startDate: "",
  endDate: "",
  extractionMethod: "",
  minConfidence: "",
  onlyUnseen: false,
  timeRange: "",
  onlyPostPurchaseOffer: false,
};

export const ORDERS_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "status",
  "paymentStatus",
  "sourceType",
  "merchantId",
  "affiliateId",
  "fulfillmentSource",
  "merchantOperationStatus",
  "merchantSettlementStatus",
  "search",
  "startDate",
  "endDate",
  "extractionMethod",
  "minConfidence",
  "onlyUnseen",
  "timeRange",
  "onlyPostPurchaseOffer",
] as const;

export const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseMultiFilterParam = (rawValue: string | null): string[] => {
  if (!rawValue) return [];
  return rawValue.split(",").map((s) => s.trim()).filter(Boolean);
};

export const getFiltersFromSearchParams = (searchParams: URLSearchParams): OrdersFilters => {
  const rawStatus = searchParams.get("status") || "";
  return {
    status: rawStatus
      ? rawStatus.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    paymentStatus: parseMultiFilterParam(searchParams.get("paymentStatus")),
    sourceType: parseMultiFilterParam(searchParams.get("sourceType")),
    merchantId: parseMultiFilterParam(searchParams.get("merchantId")),
    affiliateId: parseMultiFilterParam(searchParams.get("affiliateId")),
    fulfillmentSource: parseMultiFilterParam(searchParams.get("fulfillmentSource")),
    merchantOperationStatus: parseMultiFilterParam(
      searchParams.get("merchantOperationStatus"),
    ),
    merchantSettlementStatus: parseMultiFilterParam(
      searchParams.get("merchantSettlementStatus"),
    ),
    search: searchParams.get("search") || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    extractionMethod: searchParams.get("extractionMethod") || "",
    minConfidence: searchParams.get("minConfidence") || "",
    onlyUnseen: searchParams.get("onlyUnseen") === "true",
    timeRange: searchParams.get("timeRange") || "",
    onlyPostPurchaseOffer: searchParams.get("onlyPostPurchaseOffer") === "true",
  };
};

export const sanitizeStoredFilters = (value: unknown): OrdersFilters => {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<OrdersFilters>)
      : {};

  return {
    status: Array.isArray(candidate.status)
      ? candidate.status.filter((s): s is string => typeof s === "string")
      : [],
    paymentStatus: Array.isArray(candidate.paymentStatus)
      ? candidate.paymentStatus.filter((s): s is string => typeof s === "string")
      : [],
    sourceType: Array.isArray(candidate.sourceType)
      ? candidate.sourceType.filter((s): s is string => typeof s === "string")
      : [],
    merchantId: Array.isArray(candidate.merchantId)
      ? candidate.merchantId.filter((s): s is string => typeof s === "string")
      : [],
    affiliateId: Array.isArray(candidate.affiliateId)
      ? candidate.affiliateId.filter((s): s is string => typeof s === "string")
      : [],
    fulfillmentSource: Array.isArray(candidate.fulfillmentSource)
      ? candidate.fulfillmentSource.filter((s): s is string => typeof s === "string")
      : [],
    merchantOperationStatus: Array.isArray(candidate.merchantOperationStatus)
      ? candidate.merchantOperationStatus.filter((s): s is string => typeof s === "string")
      : [],
    merchantSettlementStatus: Array.isArray(candidate.merchantSettlementStatus)
      ? candidate.merchantSettlementStatus.filter((s): s is string => typeof s === "string")
      : [],
    search: typeof candidate.search === "string" ? candidate.search : "",
    startDate: typeof candidate.startDate === "string" ? candidate.startDate : "",
    endDate: typeof candidate.endDate === "string" ? candidate.endDate : "",
    extractionMethod:
      typeof candidate.extractionMethod === "string"
        ? candidate.extractionMethod
        : "",
    minConfidence:
      typeof candidate.minConfidence === "string" ? candidate.minConfidence : "",
    onlyUnseen: candidate.onlyUnseen === true,
    timeRange: typeof candidate.timeRange === "string" ? candidate.timeRange : "",
    onlyPostPurchaseOffer: candidate.onlyPostPurchaseOffer === true,
  };
};

export const readStoredOrdersListViewState = (): OrdersListViewState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(ORDERS_LIST_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<OrdersListViewState>;

    return {
      page: 1,
      limit: parsePositiveInt(parsedValue.limit, 20),
      filters: sanitizeStoredFilters(parsedValue.filters),
    };
  } catch (error) {
    console.warn("Failed to restore saved orders list state:", error);
    return null;
  }
};

export const hasOrdersQueryState = (searchParams: URLSearchParams): boolean =>
  ORDERS_LIST_QUERY_KEYS.some((key) => searchParams.has(key));

export const getInitialOrdersListViewState = (
  searchParams: URLSearchParams,
): OrdersListViewState => {
  if (hasOrdersQueryState(searchParams)) {
    return {
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      filters: getFiltersFromSearchParams(searchParams),
    };
  }

  return (
    readStoredOrdersListViewState() || {
      page: 1,
      limit: 20,
      filters: DEFAULT_ORDERS_FILTERS,
    }
  );
};
