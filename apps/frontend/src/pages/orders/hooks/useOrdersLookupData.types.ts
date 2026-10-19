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

export interface AffiliateFilterOption {
  id: string;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
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
  merchantSettlementSummary: any | null;
  merchantSettlementLoading: boolean;
  merchantSettlementError: string;
  activeCarriers: ActiveCarrierOption[];
  hasActiveTurbo: boolean;
  hasActiveQpExpress: boolean;
  hasActiveBosta: boolean;
}
