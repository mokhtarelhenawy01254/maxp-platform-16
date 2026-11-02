import React from "react";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, UserX, ChevronDown } from "lucide-react";
import type { FilterOption } from "./types";

export interface ConfirmationQueueFilterBarProps {
  appliedFilters?: {
    statuses?: string[];
    sources?: string[];
    matchMode?: string;
    excludeConfirmStatus?: string | null;
    requireConfirmedAtNull?: boolean;
    hasDateFilter?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    includeGuestOrders?: boolean;
    guestTwinReconciliation?: string;
  } | null;
  searchInput: string;
  setSearchInput: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  onlyUnassigned: boolean;
  setOnlyUnassigned: React.Dispatch<React.SetStateAction<boolean>>;
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
  activeQueueFilterCount: number;
  statusFilterLabel: string;
  sourceFilterLabel: string;
  onOpenMobileFilters: () => void;
  setPage: (val: number) => void;
}

export const ConfirmationQueueFilterBar: React.FC<ConfirmationQueueFilterBarProps> = ({
  appliedFilters,
  searchInput,
  setSearchInput,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  onlyUnassigned,
  setOnlyUnassigned,
  statusOptions,
  sourceOptions,
  activeQueueFilterCount,
  statusFilterLabel,
  sourceFilterLabel,
  onOpenMobileFilters,
  setPage,
}) => {
  const { t } = useTranslation();

  // Helper to format status names in Arabic
  const formatStatus = (s: string) => {
    const upper = String(s).toUpperCase();
    if (upper === "PENDING") return t("orders.pendingNew", { defaultValue: "قيد الانتظار" });
    if (upper === "CONFIRMED") return t("orders.confirmed", { defaultValue: "مؤكد" });
    if (upper === "PROCESSING") return t("orders.processing", { defaultValue: "قيد التجهيز" });
    if (upper === "SHIPPED") return t("orders.shipped", { defaultValue: "تم الشحن" });
    if (upper === "DELIVERED") return t("orders.delivered", { defaultValue: "تم التوصيل" });
    if (upper === "CANCELLED") return t("orders.cancelled", { defaultValue: "ملغي" });
    return s;
  };

  // Helper to format source names in Arabic
  const formatSource = (src: string) => {
    const lower = String(src).toLowerCase();
    if (lower === "storefront") return t("orders.sourceStorefront", { defaultValue: "المتجر" });
    if (lower === "manual") return t("orders.sourceManual", { defaultValue: "يدوي" });
    if (lower === "ai_conversation") return t("orders.sourceAutoConversation", { defaultValue: "محادثة ذكية" });
    if (lower === "woocommerce") return t("orders.sourceWooCommerce", { defaultValue: "ووكومرس" });
    if (lower === "pos") return t("orders.sourcePOS", { defaultValue: "نقطة بيع" });
    if (lower === "api") return t("orders.sourceAPI", { defaultValue: "API" });
    return src;
  };

  const appliedChips = React.useMemo(() => {
    const chips: string[] = [];

    // 1. Statuses
    if (appliedFilters?.statuses && appliedFilters.statuses.length > 0) {
      chips.push(appliedFilters.statuses.map(formatStatus).join("، "));
    } else if (statusFilter) {
      chips.push(statusFilterLabel);
    } else {
      chips.push(t("orders.pendingNew", { defaultValue: "قيد الانتظار" }));
    }

    // 2. Unconfirmed condition
    if (appliedFilters?.requireConfirmedAtNull !== false) {
      chips.push(t("orders.withoutConfirmation", { defaultValue: "من غير تأكيد" }));
    }

    // 3. Excluded confirm status
    if (appliedFilters?.excludeConfirmStatus) {
      chips.push(`استبعاد: ${formatStatus(appliedFilters.excludeConfirmStatus)}`);
    }

    // 4. Sources
    if (appliedFilters?.sources && appliedFilters.sources.length > 0) {
      chips.push(appliedFilters.sources.map(formatSource).join("، "));
    } else if (sourceFilter) {
      chips.push(sourceFilterLabel);
    } else {
      chips.push(t("orders.allSources", { defaultValue: "كل المصادر" }));
    }

    // 5. Match mode
    if (appliedFilters?.matchMode === "all") {
      chips.push(t("orders.matchModeAll", { defaultValue: "مطابقة الكل" }));
    }

    // 6. Guest orders condition
    if (appliedFilters?.includeGuestOrders === false) {
      chips.push(t("orders.withoutGuestOrders", { defaultValue: "بدون أوردرات ضيوف" }));
    } else if (appliedFilters?.includeGuestOrders === true) {
      chips.push(t("orders.guestWithoutTwins", { defaultValue: "أوردرات الضيوف (بدون توأم)" }));
    }

    // 7. Date filter
    if (appliedFilters?.hasDateFilter) {
      chips.push(t("orders.dateFilterApplied", { defaultValue: "نطاق تاريخ محدد" }));
    }

    // 8. Only unassigned
    if (onlyUnassigned) {
      chips.push(t("orders.unassigned", { defaultValue: "غير مخصص فقط" }));
    }

    return chips;
  }, [appliedFilters, statusFilter, statusFilterLabel, sourceFilter, sourceFilterLabel, onlyUnassigned, t]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs space-y-3">
      {/* Applied System Filters Ribbon */}
      <div
        data-testid="applied-filters-ribbon"
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pb-2.5 border-b border-border/50"
      >
        <span className="font-semibold text-foreground/80 flex items-center gap-1.5 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t("orders.appliedFilters", { defaultValue: "الفلاتر المطبقة:" })}</span>
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {appliedChips.map((chip, idx) => (
            <React.Fragment key={idx}>
              <span className="inline-flex items-center rounded-lg bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/40">
                {chip}
              </span>
              {idx < appliedChips.length - 1 && (
                <span className="text-muted-foreground/40 text-[10px]">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={String(t("orders.searchPlaceholder", { defaultValue: "بحث باسم العميل، الهاتف، أو رقم الطلب..." }))}
            className="h-10 w-full rounded-xl border border-border/70 bg-background py-2 pe-3 ps-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-start"
          />
        </div>

        {/* Mobile filter button */}
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs sm:text-sm font-bold text-primary sm:hidden active:scale-95 transition-all"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{t("orders.filter", { defaultValue: "تصفية الفلاتر" })}</span>
          {activeQueueFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold font-mono tabular-nums text-primary-foreground shadow-xs">
              {activeQueueFilterCount}
            </span>
          )}
        </button>

        {/* Desktop Filter Controls */}
        <div className="hidden gap-2 flex-wrap sm:flex items-center">
          {/* Status Filter */}
          <div className="relative">
            <select
              aria-label={String(t("orders.statusFilter", { defaultValue: "حالة الطلب" }))}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 appearance-none rounded-xl border border-border/70 bg-background pe-8 ps-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Source Filter */}
          <div className="relative">
            <select
              aria-label={String(t("orders.sourceFilter", { defaultValue: "مصدر الطلب" }))}
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 appearance-none rounded-xl border border-border/70 bg-background pe-8 ps-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Unassigned Toggle */}
          <button
            type="button"
            onClick={() => setOnlyUnassigned((prev) => !prev)}
            className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-2 active:scale-95 transition-all ${
              onlyUnassigned
                ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                : "bg-background text-foreground border-border/70 hover:bg-muted"
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>{t("orders.unassigned", { defaultValue: "غير مخصص" })}</span>
          </button>
        </div>
      </div>

      {/* Mobile Active Filter Chips */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-muted-foreground sm:hidden">
        <span className="rounded-lg bg-muted px-2.5 py-1 text-foreground font-semibold">
          {statusFilterLabel}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-foreground font-semibold">
          {sourceFilterLabel}
        </span>
        {onlyUnassigned && (
          <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 font-bold font-mono tabular-nums">
            {t("orders.unassigned", { defaultValue: "غير مخصص" })}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConfirmationQueueFilterBar;
