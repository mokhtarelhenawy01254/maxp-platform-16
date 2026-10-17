import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface BulkOrdersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  isRtl: boolean;
}

export const BulkOrdersPagination: React.FC<BulkOrdersPaginationProps> = ({
  page,
  totalPages,
  total,
  onPageChange,
  isRtl,
}) => {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const showPageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-border/70 bg-muted/20 text-xs">
      <span className="text-muted-foreground font-mono tabular-nums">
        {t("orders.totalOperations") || "إجمالي العمليات"}: {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          title="السابق"
        >
          {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        {showPageNumbers().map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[28px] h-7 rounded-lg text-xs font-mono tabular-nums font-bold transition-colors ${
              p === page
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          title="التالي"
        >
          {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
};
