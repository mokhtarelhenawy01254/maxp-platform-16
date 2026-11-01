import type {
  AffiliateFilterOption,
  AffiliateStoreOption,
} from "../utils/orderTransformer";

export type { AffiliateFilterOption, AffiliateStoreOption };

export interface OrderStatusDefinition {
  code: string;
  name: string;
  nameEn?: string;
  color?: string;
}

export interface MerchantFilterOption {
  id: string;
  name: string;
  email?: string;
  fulfillmentMode?: string;
}

export interface ActiveCarrierOption {
  id: string;
  name?: string;
  slug?: string;
  providerKey?: string;
  isActive?: boolean;
}

export interface UseOrdersLookupDataParams {
  companyId: string;
  isAdmin: boolean;
  isMerchant: boolean;
  canSelectOrders: boolean;
  merchantFilterId?: string;
  merchantFilterLength: number;
  defaultOrderStatuses: OrderStatusDefinition[];
  defaultPaymentStatuses: OrderStatusDefinition[];
  normalizeStatusCode: (value: string | null | undefined) => string;
  getApiErrorMessage: (error: unknown, fallbackMessage: string) => string;
}

export interface UseOrdersLookupDataReturn {
  orderStatuses: OrderStatusDefinition[];
  paymentStatuses: OrderStatusDefinition[];
  orderStatusMap: Map<string, OrderStatusDefinition>;
  paymentStatusMap: Map<string, OrderStatusDefinition>;
  merchantOptions: MerchantFilterOption[];
  affiliateOptions: AffiliateFilterOption[];
  storeOptions: AffiliateStoreOption[];
  /** فشل تحميل المسوقين: تعرض رسالة إعادة المحاولة بدل "لا توجد نتائج" */
  affiliateOptionsError: string;
  affiliateOptionsLoading: boolean;
  retryAffiliateOptions: () => void;
  merchantSettlementSummary: any | null;
  merchantSettlementLoading: boolean;
  merchantSettlementError: string;
  activeCarriers: ActiveCarrierOption[];
  hasActiveTurbo: boolean;
  hasActiveQpExpress: boolean;
  hasActiveBosta: boolean;
}
