import React, { useMemo } from "react";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCartStore } from "../store/useCartStore";
import { getActiveStorePromotionFromCompany } from "../utils/storePromotion";

const StorePromotionBar: React.FC = () => {
  const { settings } = useStorefrontSettings();
  const cartItems = useCartStore((state) => state.items);

  const storePromotion = useMemo(
    () => getActiveStorePromotionFromCompany(settings?.company),
    [settings],
  );

  const cartQuantity = cartItems.reduce(
    (sum, item) => sum + Math.max(1, Math.floor(item.quantity || 1)),
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
      const span = nextTier.minQuantity - prevMin;
      const advanced = cartQuantity - prevMin;
      progressPct = Math.min(100, Math.max(0, (advanced / span) * 100));
      remaining = nextTier.minQuantity - cartQuantity;
      const label = nextTier.label || `اقتربي من ${nextTier.minQuantity} قطعة`;
      message = remaining === 1
        ? `ضيفي قطعة كمان — ${label} 🎁`
        : `ضيفي ${remaining} قطع كمان — ${label} 🎁`;
    } else if (currentTier) {
      progressPct = 100;
      message = `🎉 مبروك! ${currentTier.label || "حصلتي على خصم"}`;
    } else {
      const firstTier = tiers[0];
      progressPct = 0;
      remaining = firstTier.minQuantity - cartQuantity;
      message = cartQuantity === 0
        ? `ابدئي التسوق — ${firstTier.label || "عروض بانتظارك"}`
        : `ضيفي ${remaining} قطع كمان — ${firstTier.label || "عروض بانتظارك"}`;
    }
    return { progressPct, remaining, message, currentTier, nextTier };
  }, [storePromotion, cartQuantity]);

  if (!promotionProgress) return null;

  return (
    <div className="flex items-center justify-center bg-white border-b-2 border-rose-300 shadow-[0_4px_16px_-6px_rgba(190,18,60,0.2)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <span className="truncate text-sm font-bold text-[#9f1239]">{promotionProgress.message}</span>
        <span className="shrink-0 rounded-full bg-[#fce7f3] px-3 py-1 text-xs font-bold text-[#be123c] shadow-sm">
          {cartQuantity} قطعة
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#fecdd3]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#e11d48] to-[#ec4899] transition-[width] duration-500"
          style={{ width: `${promotionProgress.progressPct}%` }}
        />
      </div>
    </div>
  );
};

export default StorePromotionBar;