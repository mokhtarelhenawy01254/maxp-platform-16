import React from "react";

export interface CustomerHistoryFiltersProps {
  orderFilter: "all" | "delivered" | "failed";
  onFilterChange: (filter: "all" | "delivered" | "failed") => void;
  totalCount: number;
  deliveredCount: number;
  failedCount: number;
  isArabic: boolean;
}

export const CustomerHistoryFilters: React.FC<CustomerHistoryFiltersProps> = ({
  orderFilter,
  onFilterChange,
  totalCount,
  deliveredCount,
  failedCount,
  isArabic,
}) => {
  return (
    <div className="flex items-center gap-1 border-b border-border/40 pb-2 text-[10px]">
      <button
        type="button"
        onClick={() => onFilterChange("all")}
        className={`px-2 py-0.5 rounded-md font-semibold transition ${
          orderFilter === "all"
            ? "bg-foreground text-background shadow-xs font-bold"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        {isArabic ? "الكل" : "All"} ({totalCount})
      </button>
      <button
        type="button"
        onClick={() => onFilterChange("delivered")}
        className={`px-2 py-0.5 rounded-md font-semibold transition ${
          orderFilter === "delivered"
            ? "bg-emerald-600 text-white font-bold"
            : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
        }`}
      >
        {isArabic ? "المستلمة" : "Delivered"} ({deliveredCount})
      </button>
      <button
        type="button"
        onClick={() => onFilterChange("failed")}
        className={`px-2 py-0.5 rounded-md font-semibold transition ${
          orderFilter === "failed"
            ? "bg-destructive text-destructive-foreground font-bold"
            : "text-destructive hover:bg-destructive/10"
        }`}
      >
        {isArabic ? "الملغية" : "Failed"} ({failedCount})
      </button>
    </div>
  );
};
