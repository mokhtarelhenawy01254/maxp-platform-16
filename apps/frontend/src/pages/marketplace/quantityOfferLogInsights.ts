type JsonRecord = Record<string, unknown>;

export interface QuantityOfferInsightsLogEntry {
  feature?: string | null;
  quantity?: number | null;
  totalCost?: number | string | null;
  metadata?: JsonRecord | string | null;
}

export interface QuantityOfferProductPerformance {
  productId: string;
  productName: string;
  panelViews: number;
  selections: number;
  copySelectionActions: number;
  addToCartActions: number;
  ordersCreated: number;
  trackedCartValue: number;
  trackedOrderValue: number;
}

export interface QuantityOfferTierPerformance {
  key: string;
  productId: string;
  productName: string;
  offerId: string;
  offerLabel: string;
  offerQuantity: number;
  selections: number;
  copySelectionActions: number;
  addToCartActions: number;
  ordersCreated: number;
  trackedCartValue: number;
  trackedOrderValue: number;
}

export interface QuantityOfferLogInsights {
  sampledLogCount: number;
  products: QuantityOfferProductPerformance[];
  offers: QuantityOfferTierPerformance[];
}

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseMetadata = (value: unknown): JsonRecord => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const sortByPerformance = <
  T extends {
    trackedOrderValue: number;
    ordersCreated: number;
    trackedCartValue: number;
    addToCartActions: number;
    selections?: number;
  },
>(
  rows: T[],
) =>
  [...rows].sort((left, right) => {
    if (right.trackedOrderValue !== left.trackedOrderValue) {
      return right.trackedOrderValue - left.trackedOrderValue;
    }
    if (right.ordersCreated !== left.ordersCreated) {
      return right.ordersCreated - left.ordersCreated;
    }
    if (right.trackedCartValue !== left.trackedCartValue) {
      return right.trackedCartValue - left.trackedCartValue;
    }
    if (right.addToCartActions !== left.addToCartActions) {
      return right.addToCartActions - left.addToCartActions;
    }
    return Number(right.selections || 0) - Number(left.selections || 0);
  });

export const buildQuantityOfferLogInsights = (
  logs: QuantityOfferInsightsLogEntry[] | null | undefined,
): QuantityOfferLogInsights => {
  const productMap = new Map<string, QuantityOfferProductPerformance>();
  const offerMap = new Map<string, QuantityOfferTierPerformance>();

  for (const log of logs || []) {
    const feature = String(log?.feature || "").trim();
    const metadata = parseMetadata(log?.metadata);
    const productId = String(metadata.productId || "").trim();

    if (!feature || !productId) {
      continue;
    }

    const productName =
      String(metadata.productName || "منتج بدون اسم").trim() || "منتج بدون اسم";
    const offerId = String(metadata.offerId || "").trim();
    const offerLabel = String(metadata.offerLabel || "").trim();
    const offerQuantity = Math.max(0, Number(metadata.offerQuantity || 0));
    const logQuantity = Math.max(0, Number(log?.quantity || 0));
    const logTotalCost = toSafeNumber(log?.totalCost);

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName,
        panelViews: 0,
        selections: 0,
        copySelectionActions: 0,
        addToCartActions: 0,
        ordersCreated: 0,
        trackedCartValue: 0,
        trackedOrderValue: 0,
      });
    }

    const productRow = productMap.get(productId)!;

    if (feature === "quantity_offer_panel_view") {
      productRow.panelViews += 1;
    }
    if (feature === "quantity_offer_select") {
      productRow.selections += 1;
    }
    if (feature === "quantity_offer_copy_first_selection") {
      productRow.copySelectionActions += 1;
    }
    if (feature === "quantity_offer_add_to_cart") {
      productRow.addToCartActions += 1;
      productRow.trackedCartValue = toSafeNumber(productRow.trackedCartValue + logTotalCost);
    }
    if (feature === "quantity_offer_order_created") {
      productRow.ordersCreated += 1;
      productRow.trackedOrderValue = toSafeNumber(productRow.trackedOrderValue + logTotalCost);
    }

    if (!offerId) {
      continue;
    }

    const offerKey = `${productId}:${offerId}`;
    if (!offerMap.has(offerKey)) {
      offerMap.set(offerKey, {
        key: offerKey,
        productId,
        productName,
        offerId,
        offerLabel: offerLabel || `عرض ${offerQuantity || logQuantity || 0} قطع`,
        offerQuantity: Math.max(offerQuantity, logQuantity),
        selections: 0,
        copySelectionActions: 0,
        addToCartActions: 0,
        ordersCreated: 0,
        trackedCartValue: 0,
        trackedOrderValue: 0,
      });
    }

    const offerRow = offerMap.get(offerKey)!;

    if (feature === "quantity_offer_select") {
      offerRow.selections += 1;
    }
    if (feature === "quantity_offer_copy_first_selection") {
      offerRow.copySelectionActions += 1;
    }
    if (feature === "quantity_offer_add_to_cart") {
      offerRow.addToCartActions += 1;
      offerRow.trackedCartValue = toSafeNumber(offerRow.trackedCartValue + logTotalCost);
    }
    if (feature === "quantity_offer_order_created") {
      offerRow.ordersCreated += 1;
      offerRow.trackedOrderValue = toSafeNumber(offerRow.trackedOrderValue + logTotalCost);
    }
  }

  return {
    sampledLogCount: Array.isArray(logs) ? logs.length : 0,
    products: sortByPerformance(Array.from(productMap.values())),
    offers: sortByPerformance(Array.from(offerMap.values())),
  };
};

export default buildQuantityOfferLogInsights;
