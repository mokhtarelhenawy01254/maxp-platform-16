import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingBagIcon,
  PlusIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

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
      ? "text-lg font-semibold text-slate-900 dark:text-white"
      : "text-lg font-medium text-slate-900 dark:text-slate-100";

  const actionsClass =
    variant === "mobile"
      ? "mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center"
      : "mt-6 flex flex-wrap items-center justify-center gap-2";

  const content = (
    <>
      <ShoppingBagIcon className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
      <p className={titleClass}>
        {error ? t("orders.failedToLoadOrders") : t("orders.noOrders")}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {error ? error : t("orders.noOrdersFound")}
      </p>
      {!error && (
        <div className={actionsClass}>
          {!isMerchant && (
            <Link
              to="/orders/manual"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <PlusIcon className="h-4 w-4" />
              {t("orders.createManualOrder")}
            </Link>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FunnelIcon className="h-4 w-4" />
              {t("orders.clearFilters")}
            </button>
          )}
        </div>
      )}
    </>
  );

  if (variant === "mobile") {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300/80 bg-white/80 px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        {content}
      </div>
    );
  }

  return <div className="flex flex-col items-center justify-center">{content}</div>;
};

export default OrdersEmptyState;
