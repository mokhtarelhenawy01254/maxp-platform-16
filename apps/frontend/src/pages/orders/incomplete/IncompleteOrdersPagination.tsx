import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDirection } from "../../../i18n";

interface IncompleteOrdersPaginationProps {
  page: number;
  limit: number;
  totalOrders: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const IncompleteOrdersPagination: React.FC<IncompleteOrdersPaginationProps> = ({
  page,
  limit,
  totalOrders,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const isRTL = getDirection() === "rtl";
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  if (totalOrders <= 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalOrders);

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 text-xs sm:text-sm">
      <div className="text-muted-foreground font-mono tabular-nums">
        <span className="font-semibold text-foreground">
          {totalOrders.toLocaleString()}
        </span>{" "}
        <span>{t("orders.orders2")}</span>{" "}
        <span className="text-border mx-1">·</span>
        <span>{t("orders.showing")}</span>{" "}
        <span className="font-semibold text-foreground">
          {startItem.toLocaleString()}
        </span>{" "}
        <span>{t("orders.to")}</span>{" "}
        <span className="font-semibold text-foreground">
          {endItem.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <PrevIcon className="h-3.5 w-3.5" />
          <span>{t("orders.previous")}</span>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const pg = start + i;
            if (pg > totalPages) return null;
            return (
              <button
                key={pg}
                type="button"
                onClick={() => onPageChange(pg)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold font-mono tabular-nums transition-all ${
                  pg === page
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/60"
                }`}
              >
                {pg}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>{t("orders.next")}</span>
          <NextIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default IncompleteOrdersPagination;
