interface CartItem {
  productId?: string;
  id?: string;
  quantity: number;
  price: number;
}

interface PromotionTier {
  minQuantity: number;
  type: "cheapest_percentage" | "all_percentage";
  value: number;
  items: number;
  label: string;
  isActive?: boolean;
}

interface StorePromotion {
  isActive: boolean;
  title: string;
  tiers: PromotionTier[];
  disableOtherDiscounts?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

interface DiscountResult {
  discount: number;
  discountDetails: { productId: string; discount: number }[];
  tier: PromotionTier | null;
  totalQuantity: number;
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTiers = (raw: unknown): PromotionTier[] => {
  if (!raw) return [];
  let arr: unknown[];
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }
  return arr
    .filter(
      (t): t is PromotionTier =>
        typeof t === "object" && t !== null && "minQuantity" in t && "type" in t,
    )
    .filter((t) => t.isActive !== false)
    .sort((a, b) => a.minQuantity - b.minQuantity);
};

const getApplicableTier = (
  tiers: PromotionTier[],
  cartQuantity: number,
): PromotionTier | null => {
  const candidates = tiers.filter((t) => cartQuantity >= t.minQuantity);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.minQuantity - a.minQuantity)[0];
};

export const calculateStorePromotionDiscount = (
  cartItems: CartItem[],
  promotion: StorePromotion | null,
): DiscountResult => {
  if (
    !promotion ||
    !promotion.isActive ||
    !Array.isArray(promotion.tiers) ||
    promotion.tiers.length === 0
  ) {
    return { discount: 0, discountDetails: [], tier: null, totalQuantity: 0 };
  }

  const parsedTiers = parseTiers(promotion.tiers);
  if (parsedTiers.length === 0) {
    return { discount: 0, discountDetails: [], tier: null, totalQuantity: 0 };
  }

  const totalQuantity = cartItems.reduce(
    (sum, item) => sum + Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1))),
    0,
  );

  const tier = getApplicableTier(parsedTiers, totalQuantity);
  if (!tier) {
    return { discount: 0, discountDetails: [], tier: null, totalQuantity };
  }

  const allUnitPrices: { productId: string; price: number }[] = [];
  for (const item of cartItems) {
    const qty = Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1)));
    const price = Math.max(0, toFiniteNumber(item.price, 0));
    const pid = item.productId || item.id || "unknown";
    for (let i = 0; i < qty; i++) {
      allUnitPrices.push({ productId: pid, price });
    }
  }

  allUnitPrices.sort((a, b) => a.price - b.price);

  let totalDiscount = 0;
  const discountDetails: { productId: string; discount: number }[] = [];

  if (tier.type === "cheapest_percentage") {
    const count = Math.min(tier.items, allUnitPrices.length);
    for (let i = 0; i < count; i++) {
      const itemDiscount = Number(
        ((allUnitPrices[i].price * tier.value) / 100).toFixed(2),
      );
      totalDiscount += itemDiscount;
      discountDetails.push({
        productId: allUnitPrices[i].productId,
        discount: itemDiscount,
      });
    }
  } else if (tier.type === "all_percentage") {
    for (const unit of allUnitPrices) {
      const itemDiscount = Number(
        ((unit.price * tier.value) / 100).toFixed(2),
      );
      totalDiscount += itemDiscount;
      discountDetails.push({ productId: unit.productId, discount: itemDiscount });
    }
  }

  return {
    discount: Number(totalDiscount.toFixed(2)),
    discountDetails,
    tier,
    totalQuantity,
  };
};

export const getActiveStorePromotionFromCompany = (
  company: unknown,
): StorePromotion | null => {
  if (!company || typeof company !== "object") return null;
  const c = company as Record<string, unknown>;
  const rawPromotion = c.storePromotion;
  if (!rawPromotion || typeof rawPromotion !== "object") return null;
  const p = rawPromotion as Record<string, unknown>;
  if (p.isActive !== true) return null;
  let tiers: PromotionTier[] = [];
  if (typeof p.tiers === "string") {
    try {
      tiers = JSON.parse(p.tiers);
    } catch {
      tiers = [];
    }
  } else if (Array.isArray(p.tiers)) {
    tiers = p.tiers as PromotionTier[];
  }
  return {
    isActive: true,
    title: String(p.title || ""),
    tiers,
    disableOtherDiscounts: p.disableOtherDiscounts === true,
    startDate: p.startDate ? String(p.startDate) : null,
    endDate: p.endDate ? String(p.endDate) : null,
  };
};
// ponytail: no product exclusions, no category filter
// add when: stores need granular control over applicable items
