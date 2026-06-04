import type { FacebookAdsDecisionSummary } from "../../services/facebookAdsService";

export type FacebookAdsDecisionRow = FacebookAdsDecisionSummary["rows"][number];

export interface MissingCostProductGroup {
  productId: string;
  productName: string;
  ads: number;
  spend: number;
  purchases: number;
  rows: FacebookAdsDecisionRow[];
}

export interface MissingCostReadinessSummary {
  groups: MissingCostProductGroup[];
  totals: {
    products: number;
    ads: number;
    spend: number;
    purchases: number;
  };
}

const toNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const isMissingProductCostDecision = (row: FacebookAdsDecisionRow) => {
  const productId = row.decision.economics.productId || row.ad.productId;
  const costSource =
    row.decision.economics.costSource || row.decision.tracking.costSource;

  return Boolean(
    productId &&
      costSource === "ESTIMATED_60_PERCENT" &&
      row.decision.economics.profitabilityReady !== true,
  );
};

export const summarizeMissingProductCosts = (
  rows: FacebookAdsDecisionRow[] | undefined,
  visibleLimit = 3,
): MissingCostReadinessSummary => {
  const groupsByProduct = new Map<string, MissingCostProductGroup>();

  (rows || []).forEach((row) => {
    if (!isMissingProductCostDecision(row)) return;

    const productId = row.decision.economics.productId || row.ad.productId;
    if (!productId) return;

    const current = groupsByProduct.get(productId) || {
      productId,
      productName:
        row.decision.economics.productName ||
        row.ad.name ||
        "منتج بدون اسم",
      ads: 0,
      spend: 0,
      purchases: 0,
      rows: [],
    };

    current.ads += 1;
    current.spend += toNumber(row.decision.metrics.spend ?? row.summary.spend);
    current.purchases += toNumber(
      row.decision.metrics.purchases ?? row.summary.purchases,
    );
    current.rows.push(row);
    groupsByProduct.set(productId, current);
  });

  const allGroups = Array.from(groupsByProduct.values()).sort((a, b) => {
    if (b.spend !== a.spend) return b.spend - a.spend;
    if (b.ads !== a.ads) return b.ads - a.ads;
    return a.productName.localeCompare(b.productName, "ar");
  });

  const totals = allGroups.reduce(
    (acc, group) => ({
      products: acc.products + 1,
      ads: acc.ads + group.ads,
      spend: acc.spend + group.spend,
      purchases: acc.purchases + group.purchases,
    }),
    { products: 0, ads: 0, spend: 0, purchases: 0 },
  );

  return {
    groups: allGroups.slice(0, Math.max(0, visibleLimit)),
    totals,
  };
};
