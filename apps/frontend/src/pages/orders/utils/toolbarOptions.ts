import type { TFunction } from "i18next";
import type { MultiSelectOption } from "../components/MultiSelectFilter";
import type {
  OrdersFilters,
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
} from "../Orders";

export interface QuickViewItem {
  key: string;
  label: string;
  isActive: (f: OrdersFilters) => boolean;
  apply: () => void;
}

export const buildQuickViews = (
  t: TFunction,
  onSetQuickDate: (range: string) => void,
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void,
): QuickViewItem[] => [
  {
    key: "all",
    label: String(t("orders.allOrders")),
    isActive: (f: OrdersFilters) =>
      !f.timeRange && f.status.length === 0 && !f.onlyUnseen,
    apply: () => {
      onFilterChange("status", []);
      onFilterChange("timeRange", "");
      onFilterChange("onlyUnseen", false);
    },
  },
  {
    key: "today",
    label: String(t("orders.today")),
    isActive: (f: OrdersFilters) => f.timeRange === "today",
    apply: () => onSetQuickDate("today"),
  },
  {
    key: "pending",
    label: String(t("orders.pending")),
    isActive: (f: OrdersFilters) =>
      f.status.length === 1 && f.status[0]?.toUpperCase() === "PENDING",
    apply: () => onFilterChange("status", ["PENDING"]),
  },
  {
    key: "processing",
    label: String(t("orders.processing")),
    isActive: (f: OrdersFilters) =>
      f.status.length === 1 && f.status[0]?.toUpperCase() === "PROCESSING",
    apply: () => onFilterChange("status", ["PROCESSING"]),
  },
  {
    key: "cancelled",
    label: String(t("orders.cancelled")),
    isActive: (f: OrdersFilters) =>
      f.status.length === 1 && f.status[0]?.toUpperCase() === "CANCELLED",
    apply: () => onFilterChange("status", ["CANCELLED"]),
  },
];

export const buildStatusOptions = (
  filterableOrderStatuses: OrderStatusDefinition[],
  t: TFunction,
): MultiSelectOption[] => [
  ...filterableOrderStatuses.map((status) => ({
    code: status.code.toLowerCase(),
    name: status.name,
    color: status.color,
  })),
  { code: "trash", name: String(t("orders.trash")) },
];

export const buildPaymentStatusOptions = (
  filterablePaymentStatuses: Array<{ code: string; name: string }>,
): MultiSelectOption[] =>
  filterablePaymentStatuses.map((status) => ({
    code: status.code.toLowerCase(),
    name: status.name,
  }));

export const buildSourceOptions = (t: TFunction): MultiSelectOption[] => [
  { code: "ai_conversation", name: String(t("orders.sourceAutoConversation")) },
  { code: "manual", name: String(t("orders.sourceManual")) },
  { code: "storefront", name: String(t("orders.sourceStorefront")) },
  { code: "woocommerce", name: String(t("orders.sourceWooCommerce")) },
  { code: "pos", name: String(t("orders.sourcePOS")) },
  { code: "api", name: String(t("orders.sourceAPI")) },
  { code: "import", name: String(t("orders.sourceImport")) },
  { code: "unknown", name: String(t("orders.sourceUnknown")) },
];

export const buildFulfillmentOptions = (t: TFunction): MultiSelectOption[] => [
  { code: "MERCHANT", name: String(t("orders.fromMerchant")) },
  { code: "COMPANY_WAREHOUSE", name: String(t("orders.fromCompanyWarehouse")) },
];

export const buildOperationOptions = (t: TFunction): MultiSelectOption[] => [
  { code: "PREPARATION", name: String(t("orders.preparation")) },
  { code: "IN_SHIPPING", name: String(t("orders.inShipping")) },
  { code: "DELIVERED", name: String(t("orders.delivered")) },
  { code: "NOT_DELIVERED", name: String(t("orders.returnedOrNotDelivered")) },
];

export const buildSettlementOptions = (t: TFunction): MultiSelectOption[] => [
  { code: "PAYABLE", name: String(t("orders.settlementPayable")) },
  { code: "PAID", name: String(t("orders.settlementPaid")) },
  { code: "NOT_PAYABLE", name: String(t("orders.settlementNotPayable")) },
];

export const buildMerchantOptionsList = (
  merchantOptions: MerchantFilterOption[],
): MultiSelectOption[] =>
  merchantOptions.map((merchantOption) => ({
    code: merchantOption.id,
    name: merchantOption.name || merchantOption.email || merchantOption.id,
  }));

export const buildAffiliateOptionsList = (
  affiliateOptions: AffiliateFilterOption[],
  getAffiliateDisplayName: (affiliate: AffiliateFilterOption) => string,
): MultiSelectOption[] =>
  affiliateOptions.map((affiliateOption) => ({
    code: affiliateOption.id,
    name: getAffiliateDisplayName(affiliateOption),
  }));
