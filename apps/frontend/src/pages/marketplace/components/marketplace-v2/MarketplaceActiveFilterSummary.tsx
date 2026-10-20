import React from "react";
import { X } from "lucide-react";
import type { Category } from "@/types/marketplace";

interface MarketplaceActiveFilterSummaryProps {
  filteredAppsCount: number;
  selectedSystemHub: string;
  activeHubNameAr?: string;
  selectedCategory: string;
  categories: Category[];
  statusFilter: "ALL" | "INSTALLED" | "NOT_INSTALLED";
  priceFilter: "ALL" | "FREE" | "PAID";
  searchQuery: string;
  onClearHub: () => void;
  onClearCategory: () => void;
  onClearStatus: () => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}

export function MarketplaceActiveFilterSummary({
  filteredAppsCount,
  selectedSystemHub,
  activeHubNameAr,
  selectedCategory,
  categories,
  statusFilter,
  priceFilter,
  searchQuery,
  onClearHub,
  onClearCategory,
  onClearStatus,
  onClearSearch,
  onResetFilters,
}: MarketplaceActiveFilterSummaryProps) {
  const isAnyFilterActive =
    selectedSystemHub !== "ALL" ||
    Boolean(selectedCategory) ||
    Boolean(searchQuery) ||
    statusFilter !== "ALL" ||
    priceFilter !== "ALL";

  if (!isAnyFilterActive) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/25 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <span>
          النتائج: <strong className="text-foreground font-bold tabular-nums font-mono">{filteredAppsCount}</strong> تطبيق
        </span>
        {selectedSystemHub !== "ALL" && activeHubNameAr && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-foreground text-background font-bold">
            {activeHubNameAr}
            <X size={12} className="cursor-pointer hover:opacity-75" onClick={onClearHub} />
          </span>
        )}
        {selectedCategory && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
            {categories.find((c) => c.category === selectedCategory)?.name || selectedCategory}
            <X size={12} className="cursor-pointer hover:opacity-75" onClick={onClearCategory} />
          </span>
        )}
        {statusFilter !== "ALL" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-foreground border border-border/40 font-semibold">
            {statusFilter === "INSTALLED" ? "المثبتة فقط" : "غير المثبتة"}
            <X size={12} className="cursor-pointer hover:opacity-75" onClick={onClearStatus} />
          </span>
        )}
        {searchQuery && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background text-foreground border border-border/40 font-semibold">
            بحث: &ldquo;{searchQuery}&rdquo;
            <X size={12} className="cursor-pointer hover:opacity-75" onClick={onClearSearch} />
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onResetFilters}
        className="text-primary hover:underline font-bold shrink-0 text-xs"
      >
        إعادة ضبط الفلاتر
      </button>
    </div>
  );
}
