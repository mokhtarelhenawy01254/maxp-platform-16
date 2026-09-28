import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, ShoppingBag } from "lucide-react";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCartStore } from "../store/useCartStore";
import { getActiveStorePromotionFromCompany } from "../utils/storePromotion";

const StorePromotionBar: React.FC = () => {
  const { settings } = useStorefrontSettings();
  const cartItems = useCartStore((state) => state.items);
  const location = useLocation();

  const storePromotion = useMemo(
    () => getActiveStorePromotionFromCompany(settings?.company),
    [settings?.company],
  );

  const showBar = useMemo(() => {
    if (!storePromotion || storePromotion.barVisible === false) return false;
    const barPages = storePromotion.barPages || "all";
    if (barPages === "all") return true;

    const path = location.pathname.toLowerCase();
    const isProduct = path.includes("/product");
    const isCheckout = path.includes("/checkout") || path.includes("/cart");
    const isShop = !isProduct && !isCheckout;

    if (barPages === "shop") return isShop;
    if (barPages === "product") return isProduct;
    if (barPages === "checkout") return isCheckout;
    return true;
  }, [storePromotion, location.pathname]);

  const cartQuantity = cartItems.reduce(
    (sum, item) => sum + Math.max(1, Math.floor(Number(item.quantity) || 1)),
    0,
  );

  const promotionProgress = useMemo(() => {
    if (!storePromotion || !storePromotion.tiers || storePromotion.tiers.length === 0) return null;
    const tiers = [...storePromotion.tiers]
      .filter((t) => t.isActive !== false)
      .sort((a, b) => a.minQuantity - b.minQuantity);
    if (tiers.length === 0) return null;

    const currentTier = [...tiers].reverse().find((t) => cartQuantity >= t.minQuantity) || null;
    const nextTier = tiers.find((t) => t.minQuantity > cartQuantity) || null;

    let progressPct = 100;
    let remaining = 0;
    let message = "";

    if (nextTier) {
      const prevMin = currentTier ? currentTier.minQuantity : 0;
      const span = Math.max(1, nextTier.minQuantity - prevMin);
      const advanced = cartQuantity - prevMin;
      progressPct = Math.min(100, Math.max(0, (advanced / span) * 100));
      remaining = nextTier.minQuantity - cartQuantity;
      const label = nextTier.label || `خصم عند ${nextTier.minQuantity} قطع`;
      message = remaining === 1
        ? `أضف قطعة واحدة فقط — ${label}`
        : `أضف ${remaining} قطع — ${label}`;
    } else if (currentTier) {
      progressPct = 100;
      message = `🎉 مبروك! استحققت: ${currentTier.label || "خصم الكمية"}`;
    } else {
      const firstTier = tiers[0];
      progressPct = 0;
      remaining = firstTier.minQuantity - cartQuantity;
      message = cartQuantity === 0
        ? `${storePromotion.title ? `${storePromotion.title}: ` : ""}${firstTier.label || "عروض كميات حصرية بانتظارك"}`
        : `أضف ${remaining} قطع — ${firstTier.label || "عروض كميات حصرية بانتظارك"}`;
    }

    return { progressPct, remaining, message, currentTier, nextTier };
  }, [storePromotion, cartQuantity]);

  if (!promotionProgress || !showBar) return null;

  return (
    <div
      role="region"
      aria-label="عرض المتجر الشامل"
      className={`relative w-full overflow-hidden bg-gradient-to-r from-slate-950 via-[#4c0519] to-slate-950 text-white border-b border-rose-500/30 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] select-none transition-all duration-300 ${
        storePromotion?.barSticky ? "sticky top-0 z-[60]" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:py-2.5 sm:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40">
            <Sparkles className="h-3 w-3" />
          </span>
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide line-clamp-2 sm:line-clamp-1 leading-snug">
            {promotionProgress.message}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors border border-white/20 px-2.5 py-0.5 text-[11px] sm:text-xs font-black text-rose-100 tabular-nums shadow-sm">
            <ShoppingBag className="h-3 w-3 text-rose-300" />
            <span>{cartQuantity}</span>
            <span className="hidden xs:inline">قطع بالسلة</span>
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(5, promotionProgress.progressPct)}%` }}
        />
      </div>
    </div>
  );
};

export default StorePromotionBar;