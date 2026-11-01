export type TierType = "cheapest_percentage" | "all_percentage";

export const TIER_TYPE_LABELS: Record<string, string> = {
  cheapest_percentage: "خصم على أرخص قطعة",
  all_percentage: "خصم على كل القطع",
};

export const getTierTypeLabel = (
  type: string,
  t?: (key: string, fallback?: string) => string
): string => {
  if (t) {
    if (type === "cheapest_percentage") {
      return t("storePromotionSettings.cheapestDiscounted", "خصم على أرخص قطعة");
    }
    if (type === "all_percentage") {
      return t("storePromotionSettings.allDiscounted", "خصم على كل القطع");
    }
  }
  return TIER_TYPE_LABELS[type] || type;
};

export interface PromotionTier {
  id: string;
  minQuantity: number;
  type: TierType;
  value: number;
  items: number;
  label: string;
  isActive: boolean;
}

export interface StorePromotion {
  isActive: boolean;
  title: string;
  tiers: PromotionTier[];
  disableOtherDiscounts: boolean;
  startDate: string;
  endDate: string;
  barVisible: boolean;
  barSticky: boolean;
  barPages: string;
}

export const defaultPromotion = (): StorePromotion => ({
  isActive: false,
  title: "",
  tiers: [],
  disableOtherDiscounts: false,
  startDate: "",
  endDate: "",
  barVisible: true,
  barSticky: false,
  barPages: "all",
});

export const generateTierId = () => `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const parseTiersJson = (raw: unknown): PromotionTier[] => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as PromotionTier[];
  return [];
};
