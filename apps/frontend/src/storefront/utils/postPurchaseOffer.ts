export interface PostPurchaseOfferTokenConfig {
  enabled?: boolean;
  productId?: string;
  triggerCondition?: 'all' | 'specific_products';
  triggerProductIds?: string[];
  [key: string]: any;
}

/**
 * Resolves post-purchase offer configuration from storefront settings.
 * Supports both nested paths (storefront.designTokens & storefrontSettings.designTokens)
 * as well as root-level fallback.
 */
export function getPostPurchaseOfferConfig(settings: any): PostPurchaseOfferTokenConfig | null {
  if (!settings) return null;
  return (
    settings?.storefront?.designTokens?.postPurchaseOffer ??
    settings?.storefrontSettings?.designTokens?.postPurchaseOffer ??
    settings?.designTokens?.postPurchaseOffer ??
    null
  );
}

/**
 * Determines whether the customer should be routed to `/order-offer` or directly to `/thank-you`.
 *
 * @param settings Storefront settings object
 * @param orderedItems Array of items purchased in the checkout (each with at least productId)
 * @returns '/order-offer' | '/thank-you'
 */
export function resolvePostPurchaseTarget(
  settings: any,
  orderedItems?: Array<{ productId?: string; [key: string]: any }> | null
): '/order-offer' | '/thank-you' {
  const cfg = getPostPurchaseOfferConfig(settings);

  // If offer is disabled or has no offer product selected, always go to thank-you
  if (!cfg?.enabled || !cfg?.productId) {
    return '/thank-you';
  }

  // If offer is restricted to specific triggering products
  if (cfg.triggerCondition === 'specific_products') {
    const triggerIds = Array.isArray(cfg.triggerProductIds)
      ? cfg.triggerProductIds.map(String).filter(Boolean)
      : [];

    if (triggerIds.length === 0) {
      return '/thank-you';
    }

    const idSet = new Set<string>(triggerIds);
    const hasMatchingProduct = Array.isArray(orderedItems) && orderedItems.some((it) => {
      const pid = String(it?.productId || '');
      return Boolean(pid && idSet.has(pid));
    });

    if (!hasMatchingProduct) {
      return '/thank-you';
    }
  }

  return '/order-offer';
}
