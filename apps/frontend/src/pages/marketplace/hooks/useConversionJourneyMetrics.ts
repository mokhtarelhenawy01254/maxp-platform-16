import { useMemo } from "react";
import {
  MarketplaceUsageInsights,
  ConversionJourneyMetrics,
  UpsellCenterMetrics,
  buildUsageFeatureMap,
  getFeatureActionCount,
} from "../types/appSettingsTypes";

interface UseConversionJourneyMetricsProps {
  usageInsights: MarketplaceUsageInsights | null;
  modulesSettings: Record<string, unknown>;
  thresholdsSettings: Record<string, unknown>;
}

export interface UseConversionJourneyMetricsReturn {
  usageFeatureMap: Record<string, number>;
  conversionJourney: ConversionJourneyMetrics;
  upsellCenterMetrics: UpsellCenterMetrics;
  activeUpsellPlacements: number;
  cartPlacementEnabled: boolean;
  upsellFallbackSummary: string;
}

export function useConversionJourneyMetrics({
  usageInsights,
  modulesSettings,
  thresholdsSettings,
}: UseConversionJourneyMetricsProps): UseConversionJourneyMetricsReturn {
  const usageFeatureMap = useMemo(
    () => buildUsageFeatureMap(usageInsights?.byFeature),
    [usageInsights],
  );

  const conversionJourney = useMemo<ConversionJourneyMetrics>(() => {
    const checkoutViews = getFeatureActionCount(usageFeatureMap, [
      "checkout_payment_view",
    ]);
    const checkoutClicks = getFeatureActionCount(usageFeatureMap, [
      "checkout_cta_click",
    ]);
    const orderAttempts = getFeatureActionCount(usageFeatureMap, [
      "order_submit_attempt",
    ]);
    const ordersCreated = getFeatureActionCount(usageFeatureMap, [
      "order_created",
      "duplicate_order_created",
    ]);
    const thankYouViews = getFeatureActionCount(usageFeatureMap, [
      "thank_you_view",
    ]);
    const couponAttempts = getFeatureActionCount(usageFeatureMap, [
      "coupon_validation_attempt",
    ]);
    const couponSuccesses = getFeatureActionCount(usageFeatureMap, [
      "coupon_validation_success",
    ]);
    const couponOrders = getFeatureActionCount(usageFeatureMap, [
      "coupon_applied_to_order",
    ]);
    const upsellViews = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_view",
      "post_purchase_recommendations_view",
    ]);
    const upsellClicks = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_click",
    ]);
    const upsellAdds = getFeatureActionCount(usageFeatureMap, [
      "post_purchase_upsell_add_to_cart",
    ]);
    const continueShopping = getFeatureActionCount(usageFeatureMap, [
      "thank_you_continue_shopping",
    ]);
    const whatsappSupport = getFeatureActionCount(usageFeatureMap, [
      "thank_you_whatsapp_click",
    ]);
    const emailSupport = getFeatureActionCount(usageFeatureMap, [
      "thank_you_support_email_click",
    ]);
    const trackOrderClicks = getFeatureActionCount(usageFeatureMap, [
      "thank_you_track_order_click",
    ]);
    const trackOrderSuccesses = getFeatureActionCount(usageFeatureMap, [
      "thank_you_track_order_success",
    ]);
    const reorderClicks = getFeatureActionCount(usageFeatureMap, [
      "thank_you_reorder_click",
    ]);
    const reorderCompleted = getFeatureActionCount(usageFeatureMap, [
      "thank_you_reorder_completed",
    ]);

    return {
      checkoutViews,
      checkoutClicks,
      orderAttempts,
      ordersCreated,
      thankYouViews,
      couponAttempts,
      couponSuccesses,
      couponOrders,
      upsellViews,
      upsellClicks,
      upsellAdds,
      continueShopping,
      whatsappSupport,
      emailSupport,
      trackOrderClicks,
      trackOrderSuccesses,
      reorderClicks,
      reorderCompleted,
      postPurchaseActions:
        continueShopping +
        whatsappSupport +
        emailSupport +
        trackOrderClicks +
        reorderClicks,
    };
  }, [usageFeatureMap]);

  const upsellCenterMetrics = useMemo<UpsellCenterMetrics>(
    () => ({
      crossSellViews: getFeatureActionCount(usageFeatureMap, ["cross_sell_section_view"]),
      boughtTogetherViews: getFeatureActionCount(usageFeatureMap, ["bought_together_view"]),
      boughtTogetherQuickAdds: getFeatureActionCount(usageFeatureMap, [
        "bought_together_quick_add",
      ]),
      boughtTogetherBundleAdds: getFeatureActionCount(usageFeatureMap, [
        "bought_together_bundle_add",
      ]),
      cartUpsellViews: getFeatureActionCount(usageFeatureMap, ["cart_upsell_view"]),
      cartUpsellQuickAdds: getFeatureActionCount(usageFeatureMap, [
        "cart_upsell_quick_add",
      ]),
      postPurchaseViews: conversionJourney.upsellViews,
      postPurchaseClicks: conversionJourney.upsellClicks,
      postPurchaseAdds: conversionJourney.upsellAdds,
    }),
    [conversionJourney, usageFeatureMap],
  );

  const activeUpsellPlacements = [
    Boolean(modulesSettings["crossSell"]),
    Boolean(modulesSettings["boughtTogether"]),
    Boolean(modulesSettings["postPurchaseUpsell"]),
  ].filter(Boolean).length;

  const cartPlacementEnabled = Boolean(
    modulesSettings["crossSell"] || modulesSettings["boughtTogether"],
  );

  const upsellFallbackSummary = (() => {
    const priceRange = Number(thresholdsSettings["upsellPriceRangePercent"] || 20);
    return priceRange > 0 ? `+${priceRange}%` : "بدون تفضيل سعري";
  })();

  return {
    usageFeatureMap,
    conversionJourney,
    upsellCenterMetrics,
    activeUpsellPlacements,
    cartPlacementEnabled,
    upsellFallbackSummary,
  };
}
