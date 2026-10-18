import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../constants";
import type { PageSize } from "../types";

export interface PreparationPaginationBarProps {
  page: number;
  totalPages: number;
  currentPageCount: number;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export const PreparationPaginationBar: React.FC<PreparationPaginationBarProps> = ({
  page,
  totalPages,
  currentPageCount,
  pageSize,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
      <div className="flex flex-wrap items-center gap-3 max-sm:justify-center">
        <p className="text-xs text-muted-foreground">
          {t("preparation.pagination.pageInfo", {
            page,
            totalPages,
            count: currentPageCount,
            defaultValue: `الصفحة ${page} من ${totalPages} (${currentPageCount} طلب)`,
          })}
        </p>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t("preparation.pagination.show", { defaultValue: "عرض" })}
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="rounded-lg border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary font-mono tabular-nums"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {t("preparation.pagination.perPage", { defaultValue: "في الصفحة" })}
        </label>
      </div>

      <div className="flex items-center justify-center gap-2 max-sm:w-full">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={page === 1}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{t("preparation.pagination.previous", { defaultValue: "السابق" })}</span>
        </button>

        <button
          type="button"
          onClick={onNextPage}
          disabled={page === totalPages || totalPages === 0}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <span>{t("preparation.pagination.next", { defaultValue: "التالي" })}</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PreparationPaginationBar;
