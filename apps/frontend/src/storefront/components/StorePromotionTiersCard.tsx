import React, { useMemo } from "react";
import { Sparkles, Check, Tag } from "lucide-react";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { getActiveStorePromotionFromCompany } from "../utils/storePromotion";
import { formatStorefrontCurrency } from "../utils/currency";
import type { Product } from "../hooks/useProducts";

interface StorePromotionTiersCardProps {
  product: Product;
  currency: string;
  currentQuantity: number;
  onSelectQuantity: (quantity: number) => void;
}

interface TierOption {
  quantity: number;
  title: string;
  badge?: string;
  totalPrice: number;
  originalPrice: number;
  savings: number;
  unitPrice: number;
  isOffer: boolean;
}

export const StorePromotionTiersCard: React.FC<StorePromotionTiersCardProps> = ({
  product,
  currency,
  currentQuantity,
  onSelectQuantity,
}) => {
  const { settings } = useStorefrontSettings();

  const storePromotion = useMemo(
    () => getActiveStorePromotionFromCompany(settings?.company),
    [settings?.company],
  );

  const options = useMemo((): TierOption[] => {
    if (!product || !storePromotion || !storePromotion.isActive) return [];
    const activeTiers = (storePromotion.tiers || [])
      .filter((t) => t.isActive !== false && t.minQuantity > 1)
      .sort((a, b) => a.minQuantity - b.minQuantity);

    if (activeTiers.length === 0) return [];

    // Check if item is on sale and disableOtherDiscounts is true
    const basePrice = Number(product.price || product.productVariants?.[0]?.price || 0);
    const comparePrice = Number(product.comparePrice || product.productVariants?.[0]?.comparePrice || 0);
    const isOnSale = comparePrice > basePrice && comparePrice > 0;

    if (storePromotion.disableOtherDiscounts && isOnSale) {
      return [];
    }

    if (basePrice <= 0) return [];

    // Build base option: 1 piece
    const list: TierOption[] = [
      {
        quantity: 1,
        title: "قطعة واحدة",
        totalPrice: basePrice,
        originalPrice: basePrice,
        savings: 0,
        unitPrice: basePrice,
        isOffer: false,
      },
    ];

    activeTiers.forEach((tier, index) => {
      const qty = tier.minQuantity;
      const originalTotal = basePrice * qty;
      let totalDiscount = 0;

      if (tier.type === "cheapest_percentage") {
        const discountedCount = Math.min(tier.items || 1, qty);
        totalDiscount = discountedCount * (basePrice * (tier.value / 100));
      } else if (tier.type === "all_percentage") {
        totalDiscount = qty * (basePrice * (tier.value / 100));
      }

      const totalPrice = Math.max(0, originalTotal - totalDiscount);
      const unitPrice = Number((totalPrice / qty).toFixed(2));
      const savings = Math.max(0, totalDiscount);

      let badge = "";
      if (index === 0 && activeTiers.length > 1) {
        badge = "الأكثر طلباً";
      } else if (index === activeTiers.length - 1) {
        badge = "أعلى توفير";
      }

      list.push({
        quantity: qty,
        title: tier.label || (tier.value === 100 && tier.type === "cheapest_percentage" ? `اشتري ${qty} وواحدة هدية` : `اشتري ${qty} بخصم ${tier.value}%`),
        badge,
        totalPrice,
        originalPrice: originalTotal,
        savings,
        unitPrice,
        isOffer: true,
      });
    });

    return list;
  }, [product, storePromotion]);

  if (!storePromotion || !storePromotion.isActive || options.length <= 1) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-rose-200/90 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/50 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 p-3 sm:p-4 space-y-3 shadow-[0_2px_12px_-4px_rgba(244,63,94,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-foreground tracking-tight">
              {storePromotion.title || "عروض الكميات الحصرية"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              وفّر أكثر عند زيادة عدد القطع
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300">
          <Tag className="h-3 w-3" />
          خصم فوري
        </span>
      </div>

      {/* Tiers List */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = currentQuantity === opt.quantity;
          return (
            <button
              key={opt.quantity}
              type="button"
              onClick={() => onSelectQuantity(opt.quantity)}
              aria-checked={isSelected}
              role="radio"
              className={`relative w-full text-right transition-all duration-200 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 border ${
                isSelected
                  ? "border-rose-600 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/20 shadow-sm"
                  : "border-border/70 hover:border-rose-300 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-card"
              }`}
            >
              {/* Left/Right content depending on RTL */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Radio Indicator */}
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isSelected
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-muted-foreground/40 bg-background"
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {opt.title}
                    </span>
                    {opt.badge && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {opt.isOffer && opt.savings > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block rounded bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                        وفّر {formatStorefrontCurrency(opt.savings, currency)}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        ({formatStorefrontCurrency(opt.unitPrice, currency)} / للقطعة)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-left shrink-0">
                {opt.savings > 0 && (
                  <span className="block text-[11px] text-muted-foreground line-through tabular-nums leading-tight">
                    {formatStorefrontCurrency(opt.originalPrice, currency)}
                  </span>
                )}
                <span className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-400 tabular-nums">
                  {formatStorefrontCurrency(opt.totalPrice, currency)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StorePromotionTiersCard;
