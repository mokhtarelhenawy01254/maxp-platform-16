import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, SlidersHorizontal, Eye, Gift } from "lucide-react";

export interface OrdersActionButtonsProps {
  showAdvancedFilters: boolean;
  advancedFilterCount: number;
  onlyUnseen: boolean;
  onlyPostPurchaseOffer?: boolean;
  onToggleAdvancedFilters: () => void;
  onToggleOnlyUnseen: () => void;
  onToggleOnlyPostPurchaseOffer: () => void;
  onRefresh?: () => void;
}

export const OrdersActionButtons: React.FC<OrdersActionButtonsProps> = ({
  showAdvancedFilters,
  advancedFilterCount,
  onlyUnseen,
  onlyPostPurchaseOffer,
  onToggleAdvancedFilters,
  onToggleOnlyUnseen,
  onToggleOnlyPostPurchaseOffer,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    if (onRefresh) {
      setIsSpinning(true);
      onRefresh();
      setTimeout(() => setIsSpinning(false), 700);
    }
  };

  return (
    <>
      {onRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          aria-label={String(t("orders.refreshOrders"))}
          title={t("orders.refreshOrders")}
          className="inline-flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 p-2 text-foreground transition hover:bg-muted active:scale-[0.97] cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isSpinning ? "animate-spin text-primary" : "text-muted-foreground"}`} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleAdvancedFilters}
        aria-label={String(t("orders.filters"))}
        className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
          showAdvancedFilters || advancedFilterCount > 0
            ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
            : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline whitespace-nowrap">
          {t("orders.filters")}
        </span>
        {advancedFilterCount > 0 && (
          <span
            className={`inline-flex min-w-[20px] h-5 items-center justify-center rounded-full px-1 text-[11px] font-bold font-mono tabular-nums ${
              showAdvancedFilters || advancedFilterCount > 0
                ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            }`}
          >
            {advancedFilterCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onToggleOnlyUnseen}
        aria-label={String(onlyUnseen ? t("orders.showAll") : t("orders.unseen"))}
        title={onlyUnseen ? t("orders.showAll") : t("orders.unseen")}
        className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
          onlyUnseen
            ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
            : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
        }`}
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline whitespace-nowrap">
          {onlyUnseen ? t("orders.showAll") : t("orders.unseen")}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleOnlyPostPurchaseOffer}
        aria-label={String(onlyPostPurchaseOffer ? "عرض كل الطلبات" : "عروض بعد الشراء")}
        title={onlyPostPurchaseOffer ? "عرض كل الطلبات" : "تصفية: طلبات عروض بعد الشراء"}
        className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] cursor-pointer ${
          onlyPostPurchaseOffer
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
        }`}
      >
        <Gift className={`h-4 w-4 ${onlyPostPurchaseOffer ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
        <span className="hidden sm:inline whitespace-nowrap">
          {onlyPostPurchaseOffer ? "عرض الكل" : "عروض بعد الشراء"}
        </span>
      </button>
    </>
  );
};

export default OrdersActionButtons;
