export interface QuantityOfferUsageFeatureTotals {
  actions: number;
  quantity: number;
  totalCost: number;
}

export interface QuantityOfferInsightsSummary {
  panelViews: number;
  offerSelections: number;
  copySelectionActions: number;
  addToCartActions: number;
  ordersCreated: number;
  unitsAddedToCart: number;
  unitsOrdered: number;
  trackedCartValue: number;
  trackedOrderValue: number;
  selectionRate: number;
  addToCartRate: number;
  orderCaptureRate: number;
  avgUnitsPerAdd: number;
  avgOrderValue: number;
}

type FeatureMap = Record<string, QuantityOfferUsageFeatureTotals | undefined>;

const getFeatureTotals = (
  featureMap: FeatureMap,
  featureNames: string[],
) =>
  featureNames.reduce(
    (totals, featureName) => {
      const featureTotals = featureMap[featureName];
      if (!featureTotals) {
        return totals;
      }

      return {
        actions: totals.actions + Number(featureTotals.actions || 0),
        quantity: totals.quantity + Number(featureTotals.quantity || 0),
        totalCost: totals.totalCost + Number(featureTotals.totalCost || 0),
      };
    },
    {
      actions: 0,
      quantity: 0,
      totalCost: 0,
    },
  );

const formatDecimal = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(2)) : 0;

const calculateRate = (numerator: number, denominator: number) => {
  if (!denominator) {
    return 0;
  }

  return formatDecimal((numerator / denominator) * 100);
};

export const buildQuantityOfferInsights = (
  featureMap: FeatureMap,
): QuantityOfferInsightsSummary => {
  const panelViews = getFeatureTotals(featureMap, ["quantity_offer_panel_view"]).actions;
  const offerSelections = getFeatureTotals(featureMap, ["quantity_offer_select"]).actions;
  const copySelectionActions = getFeatureTotals(
    featureMap,
    ["quantity_offer_copy_first_selection"],
  ).actions;
  const addToCartTotals = getFeatureTotals(featureMap, ["quantity_offer_add_to_cart"]);
  const orderTotals = getFeatureTotals(featureMap, ["quantity_offer_order_created"]);

  return {
    panelViews,
    offerSelections,
    copySelectionActions,
    addToCartActions: addToCartTotals.actions,
    ordersCreated: orderTotals.actions,
    unitsAddedToCart: addToCartTotals.quantity,
    unitsOrdered: orderTotals.quantity,
    trackedCartValue: formatDecimal(addToCartTotals.totalCost),
    trackedOrderValue: formatDecimal(orderTotals.totalCost),
    selectionRate: calculateRate(offerSelections, panelViews),
    addToCartRate: calculateRate(addToCartTotals.actions, panelViews),
    orderCaptureRate: calculateRate(orderTotals.actions, addToCartTotals.actions),
    avgUnitsPerAdd: formatDecimal(addToCartTotals.quantity / Math.max(addToCartTotals.actions, 1)),
    avgOrderValue: formatDecimal(orderTotals.totalCost / Math.max(orderTotals.actions, 1)),
  };
};

export default buildQuantityOfferInsights;
