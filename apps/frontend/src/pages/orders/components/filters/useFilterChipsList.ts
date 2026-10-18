import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  sourceTypeLabels,
  extractionLabels,
  fulfillmentLabels,
  merchantOperationLabels,
  settlementLabels,
} from "../../utils/filterLabels";

export type ChipTone = "primary" | "info" | "success" | "warning" | "destructive" | "neutral";

export interface ChipDescriptor {
  key: string;
  value: string;
  tone: ChipTone;
  remove: () => void;
}

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

export interface UseFilterChipsOptions {
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
  filterableOrderStatuses?: OrderStatusFilterOption[];
  filterablePaymentStatuses?: OrderStatusFilterOption[];
  merchantOptions?: MerchantFilterOption[];
  affiliateOptions?: AffiliateFilterOption[];
  onFilterChange: (key: string, value: string | boolean | string[]) => void;
}

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

export function useFilterChipsList({
  filters,
  filterableOrderStatuses = [],
  filterablePaymentStatuses = [],
  merchantOptions = [],
  affiliateOptions = [],
  onFilterChange,
}: UseFilterChipsOptions): ChipDescriptor[] {
  const { t } = useTranslation();

  return useMemo<ChipDescriptor[]>(() => {
    const list: ChipDescriptor[] = [];

    if (filters.status && filters.status.length > 0) {
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

    if (filters.paymentStatus) {
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
              filters.paymentStatus.filter(
                (v) => v.toLowerCase() !== value.toLowerCase(),
              ),
            ),
        });
      });
    }

    if (filters.sourceType) {
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
    }

    if (filters.merchantId) {
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
    }

    if (filters.affiliateId) {
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
    }

    if (filters.fulfillmentSource) {
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
    }

    if (filters.merchantOperationStatus) {
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
    }

    if (filters.merchantSettlementStatus) {
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
    }

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
        value: "طلبات العرض",
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
}
