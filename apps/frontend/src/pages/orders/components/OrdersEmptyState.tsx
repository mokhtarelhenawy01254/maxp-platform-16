import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingBag,
  Plus,
  FilterX,
} from "lucide-react";

interface OrdersEmptyStateProps {
  variant: "mobile" | "table";
  error: string | null;
  isMerchant: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const OrdersEmptyState: React.FC<OrdersEmptyStateProps> = ({
  variant,
  error,
  isMerchant,
  hasActiveFilters,
  onClearFilters,
}) => {
  const { t } = useTranslation();

  const titleClass =
    variant === "mobile"
      ? "text-base sm:text-lg font-bold text-foreground"
      : "text-base sm:text-lg font-semibold text-foreground";

  const actionsClass =
    variant === "mobile"
      ? "mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center"
      : "mt-5 flex flex-wrap items-center justify-center gap-2";

  const content = (
    <>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <p className={titleClass}>
        {error ? t("orders.failedToLoadOrders") : t("orders.noOrders")}
      </p>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
        {error ? error : t("orders.noOrdersFound")}
      </p>
      {!error && (
        <div className={actionsClass}>
          {!isMerchant && (
            <Link
              to="/orders/manual"
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              {t("orders.createManualOrder")}
            </Link>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-4 py-2 text-xs sm:text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.97]"
            >
              <FilterX className="h-4 w-4 text-muted-foreground" />
              {t("orders.clearFilters")}
            </button>
          )}
        </div>
      )}
    </>
  );

  if (variant === "mobile") {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-card/60 px-5 py-10 text-center shadow-xs">
        {content}
      </div>
    );
  }

  return <div className="flex flex-col items-center justify-center py-10">{content}</div>;
};

export default OrdersEmptyState;
