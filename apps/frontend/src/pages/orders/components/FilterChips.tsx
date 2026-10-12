import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";

export interface OrderStatusFilterOption {
  code: string;
  name: string;
  nameEn?: string;
}

export interface MerchantFilterOption {
  id: string;
  name?: string;
  email?: string;
}

export interface AffiliateFilterOption {
  id: string;
  affiliateCode?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface FilterChipsProps {
  /** Current filter state. */
  filters: {
    status: string[];
    paymentStatus: string[];
    sourceType: string[];
    merchantId: string[];
    affiliateId: string[];
    fulfillmentSource: string[];
    merchantOperationStatus: string[];
    merchantSettlementStatus: string[];
    extractionMethod: string;
    minConfidence: string;
    onlyUnseen: boolean;
    onlyPostPurchaseOffer?: boolean;
    timeRange: string;
    startDate: string;
    endDate: string;
    search: string;
  };
  /** Source for human-readable labels per status. */
  filterableOrderStatuses?: OrderStatusFilterOption[];
  filterablePaymentStatuses?: OrderStatusFilterOption[];
  merchantOptions?: MerchantFilterOption[];
  affiliateOptions?: AffiliateFilterOption[];
  /** Apply a single filter change. */
  onFilterChange: (key: string, value: string | boolean | string[]) => void;
  /** Clear the advanced filters (and the chip strip in one go). */
  onClearAdvancedFilters: () => void;
}

type ChipTone = "primary" | "info" | "success" | "warning" | "destructive" | "neutral";

interface ChipDescriptor {
  key: string;
  value: string;
  tone: ChipTone;
  remove: () => void;
}

const sourceTypeLabels: Record<string, string> = {
  ai_conversation: "orders.sourceAutoConversation",
  manual: "orders.sourceManual",
  storefront: "orders.sourceStorefront",
  woocommerce: "orders.sourceWooCommerce",
  pos: "orders.sourcePOS",
  api: "orders.sourceAPI",
  import: "orders.sourceImport",
  unknown: "orders.sourceUnknown",
};

const extractionLabels: Record<string, string> = {
  ai_enhanced: "orders.aiEnhanced",
  ai_basic: "orders.basicExtraction",
  manual: "orders.manual",
};

const fulfillmentLabels: Record<string, string> = {
  MERCHANT: "orders.fromMerchant",
  COMPANY_WAREHOUSE: "orders.fromCompanyWarehouse",
};

const merchantOperationLabels: Record<string, string> = {
  PREPARATION: "orders.preparation",
  IN_SHIPPING: "orders.inShipping",
  DELIVERED: "orders.delivered",
  NOT_DELIVERED: "orders.returnedOrNotDelivered",
};

const settlementLabels: Record<string, string> = {
  PAYABLE: "orders.settlementPayable",
  PAID: "orders.settlementPaid",
  NOT_PAYABLE: "orders.settlementNotPayable",
};

const timeRangeLabels: Record<string, string> = {
  today: "orders.today",
  yesterday: "orders.yesterday",
  last7: "orders.last7Days",
  last30: "orders.last30Days",
  last90: "orders.last90Days",
  last180: "orders.last6Months",
  last365: "orders.lastYear",
  thisMonth: "orders.thisMonth",
  thisYear: "orders.thisYear",
  custom: "orders.customPeriod",
};

const translateLookup = (
  t: (k: string) => string,
  map: Record<string, string>,
  key: string,
): string => {
  const i18nKey = map[key];
  return i18nKey ? t(i18nKey) : key;
};

/**
 * Active filter chips. Renders one pill per non-default filter value, with a
 * dismiss button that resets just that filter. Replaces the "X filters applied"
 * banner with something the user can actually interact with.
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  filterableOrderStatuses = [],
  filterablePaymentStatuses = [],
  merchantOptions = [],
  affiliateOptions = [],
  onFilterChange,
  onClearAdvancedFilters,
}) => {
  const { t } = useTranslation();

  const chips = useMemo<ChipDescriptor[]>(() => {
    const list: ChipDescriptor[] = [];

    if (filters.status.length > 0) {
      filters.status.forEach((statusCode) => {
        const match = filterableOrderStatuses.find(
          (s) => s.code.toLowerCase() === statusCode.toLowerCase(),
        );
        list.push({
          key: t("orders.orderStatus"),
          value: match?.name ?? statusCode,
          tone: "primary",
          remove: () =>
            onFilterChange(
              "status",
              filters.status.filter(
                (s) => s.toLowerCase() !== statusCode.toLowerCase(),
              ),
            ),
        });
      });
    }
    filters.paymentStatus.forEach((value) => {
      const match = filterablePaymentStatuses.find(
        (s) => s.code.toLowerCase() === value.toLowerCase(),
      );
      list.push({
        key: t("orders.payment"),
        value: match?.name ?? value,
        tone: "info",
        remove: () =>
          onFilterChange(
            "paymentStatus",
            filters.paymentStatus.filter((v) => v.toLowerCase() !== value.toLowerCase()),
          ),
      });
    });
    filters.sourceType.forEach((value) => {
      list.push({
        key: t("orders.source"),
        value: translateLookup(t, sourceTypeLabels, value),
        tone: "neutral",
        remove: () =>
          onFilterChange(
            "sourceType",
            filters.sourceType.filter((v) => v !== value),
          ),
      });
    });
    filters.merchantId.forEach((value) => {
      const match = merchantOptions.find((m) => m.id === value);
      list.push({
        key: t("orders.merchantLabel", { defaultValue: "التاجر" }),
        value: match?.name || match?.email || value,
        tone: "warning",
        remove: () =>
          onFilterChange(
            "merchantId",
            filters.merchantId.filter((v) => v !== value),
          ),
      });
    });
    filters.affiliateId.forEach((value) => {
      const match = affiliateOptions.find((a) => a.id === value);
      list.push({
        key: t("orders.affiliateLabel", { defaultValue: "المسوق" }),
        value: match?.user?.firstName
          ? `${match.user.firstName} ${match.user.lastName ?? ""}`.trim()
          : match?.affiliateCode || value,
        tone: "warning",
        remove: () =>
          onFilterChange(
            "affiliateId",
            filters.affiliateId.filter((v) => v !== value),
          ),
      });
    });
    filters.fulfillmentSource.forEach((value) => {
      list.push({
        key: t("orders.fulfillmentSource"),
        value: translateLookup(t, fulfillmentLabels, value),
        tone: "neutral",
        remove: () =>
          onFilterChange(
            "fulfillmentSource",
            filters.fulfillmentSource.filter((v) => v !== value),
          ),
      });
    });
    filters.merchantOperationStatus.forEach((value) => {
      list.push({
        key: t("orders.merchantOperationStatus"),
        value: translateLookup(t, merchantOperationLabels, value),
        tone: "info",
        remove: () =>
          onFilterChange(
            "merchantOperationStatus",
            filters.merchantOperationStatus.filter((v) => v !== value),
          ),
      });
    });
    filters.merchantSettlementStatus.forEach((value) => {
      list.push({
        key: t("orders.merchantSettlements"),
        value: translateLookup(t, settlementLabels, value),
        tone: "success",
        remove: () =>
          onFilterChange(
            "merchantSettlementStatus",
            filters.merchantSettlementStatus.filter((v) => v !== value),
          ),
      });
    });
    if (filters.extractionMethod) {
      list.push({
        key: t("orders.extractionMethod"),
        value: translateLookup(t, extractionLabels, filters.extractionMethod),
        tone: "neutral",
        remove: () => onFilterChange("extractionMethod", ""),
      });
    }
    if (filters.minConfidence) {
      list.push({
        key: t("orders.minimumConfidence"),
        value: `${filters.minConfidence}%`,
        tone: "neutral",
        remove: () => onFilterChange("minConfidence", ""),
      });
    }
    if (filters.onlyUnseen) {
      list.push({
        key: t("orders.unseen"),
        value: t("orders.showAll"),
        tone: "destructive",
        remove: () => onFilterChange("onlyUnseen", false),
      });
    }
    if (filters.onlyPostPurchaseOffer) {
      list.push({
        key: "عروض بعد الشراء",
        value: "🎁 الطلبات بالعرض",
        tone: "primary",
        remove: () => onFilterChange("onlyPostPurchaseOffer", false),
      });
    }
    if (filters.timeRange) {
      list.push({
        key: t("orders.date"),
        value: translateLookup(t, timeRangeLabels, filters.timeRange),
        tone: "primary",
        remove: () => onFilterChange("timeRange", ""),
      });
    }
    if (filters.startDate || filters.endDate) {
      const fromLabel = filters.startDate
        ? filters.startDate
        : t("orders.allDates");
      const toLabel = filters.endDate ? filters.endDate : t("orders.allDates");
      list.push({
        key: t("orders.period", { defaultValue: "الفترة" }),
        value: `${fromLabel} → ${toLabel}`,
        tone: "primary",
        remove: () => {
          onFilterChange("startDate", "");
          onFilterChange("endDate", "");
        },
      });
    }
    if (filters.search) {
      list.push({
        key: t("orders.search"),
        value: filters.search,
        tone: "neutral",
        remove: () => onFilterChange("search", ""),
      });
    }

    return list;
  }, [
    filters,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    merchantOptions,
    affiliateOptions,
    onFilterChange,
    t,
  ]);

  if (chips.length === 0) return null;

  const toneClasses: Record<ChipTone, string> = {
    primary:
      "border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15",
    info: "border-info/30 bg-info/10 text-info hover:border-info/50 hover:bg-info/15",
    success:
      "border-success/30 bg-success/10 text-success hover:border-success/50 hover:bg-success/15",
    warning:
      "border-warning/30 bg-warning/10 text-warning hover:border-warning/50 hover:bg-warning/15",
    destructive:
      "border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/15",
    neutral:
      "border-border bg-muted/40 text-foreground/80 hover:border-foreground/30 hover:bg-muted/70",
  };

  const xClasses: Record<ChipTone, string> = {
    primary: "hover:bg-primary/20 text-primary/80",
    info: "hover:bg-info/20 text-info/80",
    success: "hover:bg-success/20 text-success/80",
    warning: "hover:bg-warning/20 text-warning/80",
    destructive: "hover:bg-destructive/20 text-destructive/80",
    neutral: "hover:bg-foreground/15 text-muted-foreground",
  };

  return (
    <div
      role="region"
      aria-label={String(t("orders.activeFilters", { defaultValue: "الفلاتر النشطة" }))}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-2 text-xs shadow-[0_8px_30px_-24px_rgba(15,23,42,0.4)] backdrop-blur-sm"
    >
      <span className="inline-flex items-center gap-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <FunnelIcon className="h-3.5 w-3.5" />
        {t("orders.activeFilters", { defaultValue: "فلاتر نشطة" })}
        <span className="ms-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
          {chips.length}
        </span>
      </span>
      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${idx}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${toneClasses[chip.tone]}`}
        >
          <span className="opacity-60">{chip.key}</span>
          <span className="font-semibold">{chip.value}</span>
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`${t("orders.removeFilter", { defaultValue: "إزالة فلتر" })}: ${chip.key} ${chip.value}`}
            className={`-me-1 flex h-4 w-4 items-center justify-center rounded-full transition ${xClasses[chip.tone]}`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAdvancedFilters}
          className="ms-auto rounded-full px-2.5 py-1 text-[11px] font-semibold text-destructive transition hover:bg-destructive/10"
        >
          {t("orders.clearAll", { defaultValue: "مسح الكل" })}
        </button>
      )}
    </div>
  );
};

export default FilterChips;
