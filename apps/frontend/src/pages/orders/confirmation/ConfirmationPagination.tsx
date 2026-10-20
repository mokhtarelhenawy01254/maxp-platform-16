import React from "react";
import { useTranslation } from "react-i18next";

export interface ConfirmationPaginationProps {
  page: number;
  totalPages: number;
  ordersCount: number;
  totalOrders: number;
  onPageChange: (updater: (prev: number) => number) => void;
}

export const ConfirmationPagination: React.FC<ConfirmationPaginationProps> = ({
  page,
  totalPages,
  ordersCount,
  totalOrders,
  onPageChange,
}) => {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground px-1">
      <span className="font-mono tabular-nums">
        {t("orders.showingFrom", {
          count: ordersCount,
          total: totalOrders,
          defaultValue: `عرض ${ordersCount} من ${totalOrders} طلب`,
        })}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange((prev) => Math.max(1, prev - 1))}
          className="px-3 py-1.5 border border-border/70 rounded-xl bg-background text-foreground disabled:opacity-40 active:scale-95 transition-all text-xs font-semibold"
        >
          {t("orders.previous", { defaultValue: "السابق" })}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange((prev) => Math.min(totalPages, prev + 1))}
          className="px-3 py-1.5 border border-border/70 rounded-xl bg-background text-foreground disabled:opacity-40 active:scale-95 transition-all text-xs font-semibold"
        >
          {t("orders.next", { defaultValue: "التالي" })}
        </button>
      </div>
    </div>
  );
};
