import api from './api';

export interface ShipmentItem {
  id: string;
  companyId: string;
  trackingNumber: string;
  barcode?: string | null;
  attemptCount?: number;
  failureReasonCode?: string | null;
  failureReasonLabelAr?: string | null;
  nextAttemptDate?: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string | null;
  destinationGovernorate: string;
  destinationCity?: string | null;
  destinationAddress: string;
  pieces: number;
  weight: number;
  codAmount?: number | null;
  collectedAmount?: number | null;
  declaredValue?: number | null;
  contentDescription?: string | null;
  isFragile: boolean;
  allowOpenPackage: boolean;
  status: string;
  cost: number;
  currency: string;
  carrierType: string;
  source: string;
  metadata?: string | null;
  isInternational?: boolean;
  destinationCountry?: string | null;
  destinationCityIntl?: string | null;
  customsValue?: number | null;
  intlAckStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null;
  internationalAck?: any;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  shippingCompany?: {
    id: string;
    name: string;
  } | null;
  courier?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  events?: ShipmentEventItem[];
  courierCost?: number | null;
  costSource?: string | null;
  marginAmount?: number | null;
  remittedAt?: string | null;
  parentShipmentId?: string | null;
  allowedTransitions?: string[];
  latestEvent?: ShipmentEventItem | null;
}

export interface ShipmentEventItem {
  id: string;
  shipmentId: string;
  fromStatus?: string | null;
  toStatus: string;
  reasonCode?: string | null;
  notes?: string | null;
  actorType: string;
  actorName?: string | null;
  createdAt: string;
  metadata?: string | null;
}

export interface QuoteRequest {
  governorate: string;
  city?: string;
  destinationCity?: string;
  weightKg?: number;
  codAmount?: number;
  merchantId?: string;
}

export interface QuoteBreakdown {
  basePrice: number;
  baseWeightKg?: number;
  actualWeightKg?: number;
  extraWeightKg?: number;
  extraUnits?: number;
  extraKgPrice?: number;
  extraWeightFee?: number;
  codAmount?: number;
  codFee?: number;
  total: number;
}

export interface QuoteResponse {
  price: number;
  currency: string;
  source: string;
  priceSource?: string;
  rateCardId?: string;
  rateCardName?: string;
  packageId?: string;
  packageName?: string;
  pricingMode?: string;
  flatMonthlyPrice?: number;
  isOverage?: boolean;
  overage?: number;
  governorate: string;
  breakdown?: QuoteBreakdown;
}

export interface CreateShipmentInput {
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  destinationGovernorate: string;
  destinationCity?: string;
  destinationAddress: string;
  pieces?: number;
  weightKg?: number;
  contentDescription?: string;
  codAmount?: number;
  declaredValue?: number;
  isFragile?: boolean;
  allowOpenPackage?: boolean;
  merchantId?: string;
  notes?: string;
}

export interface ClientRateCardItem {
  id: string;
  companyId: string;
  merchantId: string;
  name: string;
  governorateCode?: string | null;
  basePrice: number;
  baseWeightKg: number;
  extraKgPrice: number;
  codFeeFixed: number;
  codFeePercent: number;
  returnFee: number;
  minWeight?: number | null;
  maxWeight?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}


export interface ClientPricingPackageItem {
  id: string;
  companyId: string;
  merchantId: string;
  name: string;
  monthlyVolumeFrom: number;
  monthlyVolumeTo?: number | null;
  pricingMode: 'PACKAGE_FLAT' | 'PER_SHIPMENT';
  flatMonthlyPrice?: number | null;
  perShipmentPrice?: number | null;
  coverageMode: 'GOVERNORATES' | 'CITIES' | 'BOTH';
  governorates?: string | null;
  cities?: string | null;
  overagePricePerShipment: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface PackageInput {
  merchantId: string;
  name: string;
  monthlyVolumeFrom: number;
  monthlyVolumeTo?: number | null;
  pricingMode: 'PACKAGE_FLAT' | 'PER_SHIPMENT';
  flatMonthlyPrice?: number | null;
  perShipmentPrice?: number | null;
  coverageMode: 'GOVERNORATES' | 'CITIES' | 'BOTH';
  governorates?: string | string[] | null;
  cities?: string | string[] | null;
  overagePricePerShipment: number;
  isActive?: boolean;
}

export interface RateCardInput {
  merchantId: string;
  name: string;
  governorateCode?: string | null;
  basePrice: number;
  baseWeightKg?: number;
  extraKgPrice?: number;
  codFeeFixed?: number;
  codFeePercent?: number;
  returnFee?: number;
  minWeight?: number;
  maxWeight?: number;
  isActive?: boolean;
}

export interface DashboardStats {
  todayCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  returnedCount: number;
  pendingCount: number;
  codExpected: number;
  codCollected: number;
  recentShipments: ShipmentItem[];
}

export interface MerchantItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface ShipmentsQuery {
  status?: string;
  governorate?: string;
  merchantId?: string;
  from?: string;
  to?: string;
  search?: string;
  needsRtoReview?: boolean;
  isInternational?: boolean;
  page?: number;
  limit?: number;
}

export interface ShipmentsResponse {
  data: ShipmentItem[];
  statusCounts?: Record<string, number>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const shippingOpsService = {
  // Quote
  async getQuote(data: QuoteRequest): Promise<QuoteResponse> {
    const res = await api.post<{ success: boolean; data: QuoteResponse }>('/shipping-portal/quote', data);
    return res.data.data;
  },

  // Shipments
  async createShipment(data: CreateShipmentInput): Promise<ShipmentItem> {
    const res = await api.post<{ success: boolean; data: ShipmentItem }>('/shipping-portal/shipments', data);
    return res.data.data;
  },

  async getShipments(params: ShipmentsQuery = {}): Promise<ShipmentsResponse> {
    const res = await api.get<{ success: boolean; data: ShipmentItem[]; statusCounts?: Record<string, number>; pagination: ShipmentsResponse['pagination'] }>(
      '/shipping-portal/shipments',
      { params }
    );
    return {
      data: res.data.data || [],
      statusCounts: res.data.statusCounts,
      pagination: res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  async getStatusCounts(): Promise<Record<string, number>> {
    const res = await api.get<{ success: boolean; data: Record<string, number> }>('/shipping-portal/status-counts');
    return res.data.data || {};
  },

  async getShipmentById(id: string): Promise<ShipmentItem> {
    const res = await api.get<{ success: boolean; data: ShipmentItem }>(`/shipping-portal/shipments/${id}`);
    return res.data.data;
  },

  async cancelShipment(id: string, reason?: string): Promise<ShipmentItem> {
    const res = await api.delete<{ success: boolean; data: ShipmentItem }>(
      `/shipping-portal/shipments/${id}/cancel`,
      { data: { reason } }
    );
    return res.data.data;
  },

  // Rate Cards
  async getRateCards(params: { merchantId?: string; governorateCode?: string; isActive?: boolean } = {}): Promise<ClientRateCardItem[]> {
    const res = await api.get<{ success: boolean; data: ClientRateCardItem[] }>('/shipping-portal/rate-cards', { params });
    return res.data.data || [];
  },

  async createRateCard(data: RateCardInput): Promise<ClientRateCardItem> {
    const res = await api.post<{ success: boolean; data: ClientRateCardItem }>('/shipping-portal/rate-cards', data);
    return res.data.data;
  },

  async updateRateCard(id: string, data: Partial<RateCardInput>): Promise<ClientRateCardItem> {
    const res = await api.put<{ success: boolean; data: ClientRateCardItem }>(`/shipping-portal/rate-cards/${id}`, data);
    return res.data.data;
  },

  async deleteRateCard(id: string): Promise<void> {
    await api.delete(`/shipping-portal/rate-cards/${id}`);
  },


  // Packages (SHIP-W14)
  async getPackages(params: { merchantId?: string; isActive?: boolean } = {}): Promise<ClientPricingPackageItem[]> {
    const res = await api.get<{ success: boolean; data: ClientPricingPackageItem[] }>('/shipping-portal/packages', { params });
    return res.data.data || [];
  },

  async getPackageById(id: string): Promise<ClientPricingPackageItem> {
    const res = await api.get<{ success: boolean; data: ClientPricingPackageItem }>(`/shipping-portal/packages/${id}`);
    return res.data.data;
  },

  async createPackage(data: PackageInput): Promise<ClientPricingPackageItem> {
    const res = await api.post<{ success: boolean; data: ClientPricingPackageItem }>('/shipping-portal/packages', data);
    return res.data.data;
  },

  async updatePackage(id: string, data: Partial<PackageInput>): Promise<ClientPricingPackageItem> {
    const res = await api.put<{ success: boolean; data: ClientPricingPackageItem }>(`/shipping-portal/packages/${id}`, data);
    return res.data.data;
  },

  async deletePackage(id: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`/shipping-portal/packages/${id}`);
    return res.data;
  },

  async getPackageQuote(params: { merchantId: string; city?: string; governorate?: string; weightKg?: number }): Promise<QuoteResponse> {
    const res = await api.get<{ success: boolean; data: QuoteResponse }>('/shipping-portal/packages/quote', { params });
    return res.data.data;
  },

  // Telemetry & Helpers
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/shipping-portal/stats');
    return res.data.data;
  },

  async getMerchants(): Promise<MerchantItem[]> {
    const res = await api.get<{ success: boolean; data: MerchantItem[] }>('/shipping-portal/merchants');
    return res.data.data || [];
  },

  // Failure Reasons & Reattempt (SHIP-W3)
  async getFailureReasons(): Promise<DeliveryFailureReasonItem[]> {
    const res = await api.get<{ success: boolean; data: DeliveryFailureReasonItem[] }>('/shipping-portal/failure-reasons');
    return res.data.data || [];
  },

  async createFailureReason(data: { code: string; labelAr: string; labelEn?: string; requiresReschedule?: boolean }): Promise<DeliveryFailureReasonItem> {
    const res = await api.post<{ success: boolean; data: DeliveryFailureReasonItem }>('/shipping-portal/failure-reasons', data);
    return res.data.data;
  },

  async updateFailureReason(id: string, data: Partial<DeliveryFailureReasonItem>): Promise<DeliveryFailureReasonItem> {
    const res = await api.patch<{ success: boolean; data: DeliveryFailureReasonItem }>(`/shipping-portal/failure-reasons/${id}`, data);
    return res.data.data;
  },

  async updateShipmentStatus(id: string, payload: { status: string; failureReasonCode?: string; nextAttemptDate?: string; notes?: string; collectedAmount?: number }): Promise<ShipmentItem> {
    const res = await api.patch<{ success: boolean; data: ShipmentItem }>(`/shipping-portal/shipments/${id}/status`, payload);
    return res.data.data;
  },

  async reshipShipment(id: string, notes?: string): Promise<{ shipment: ShipmentItem; newShipment?: ShipmentItem }> {
    const res = await api.post<{ success: boolean; data: ShipmentItem; newShipment?: ShipmentItem }>(`/shipping-portal/shipments/${id}/reship`, { notes });
    return {
      shipment: res.data.data,
      newShipment: res.data.newShipment,
    };
  },

  async reattemptShipment(id: string, payload: { nextAttemptDate?: string; courierId?: string; notes?: string } = {}): Promise<ShipmentItem> {
    const res = await api.post<{ success: boolean; data: ShipmentItem }>(`/shipping-portal/shipments/${id}/reattempt`, payload);
    return res.data.data;
  },

  async runRtoMaintenance(): Promise<{ success: boolean; data: any }> {
    const res = await api.post<{ success: boolean; data: any }>('/shipping-portal/maintenance/run-rto');
    return res.data;
  },

  async trackPublicShipment(waybill: string): Promise<PublicTrackingResponse> {
    const res = await api.get<{ success: boolean; data: PublicTrackingResponse }>(`/public/shipments/track/${encodeURIComponent(waybill)}`);
    return res.data.data;
  },

  async getWalletSummary(): Promise<CompanyWalletData> {
    const res = await api.get<{ success: boolean; data: CompanyWalletData }>('/wallet');
    return res.data.data;
  },

  async getWalletTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    reason?: string;
    from?: string;
    to?: string;
  } = {}): Promise<WalletTransactionsResponse> {
    const res = await api.get<{ success: boolean; data: CompanyWalletTransactionItem[]; pagination: any; wallet?: any }>(
      '/wallet/transactions',
      { params }
    );
    return {
      transactions: res.data.data || [],
      items: res.data.data || [],
      pagination: res.data.pagination || { total: 0, page: 1, limit: 20, pages: 0 },
      wallet: res.data.wallet,
    };
  },

  async adjustWalletBalance(payload: {
    amount: number;
    type?: string;
    reason?: string;
    notes: string;
    code?: string;
  }): Promise<{ success: boolean; data: any }> {
    const res = await api.post<{ success: boolean; data: any }>('/wallet/adjust', payload);
    return res.data;
  },

  async getWalletFees(params: { from?: string; to?: string } = {}): Promise<WalletFeesReport> {
    const res = await api.get<{ success: boolean; data: WalletFeesReport }>('/wallet/fees', { params });
    return res.data.data;
  },

  async getShippingPolicy(): Promise<ShippingPolicyData> {
    const res = await api.get<{ success: boolean; data: ShippingPolicyData }>('/shipping-portal/policy');
    return res.data.data;
  },

  async updateShippingPolicy(payload: Partial<ShippingPolicyData>): Promise<ShippingPolicyData> {
    const res = await api.put<{ success: boolean; data: ShippingPolicyData }>('/shipping-portal/policy', payload);
    return res.data.data;
  },

  // Stale Shipments (SHIP-T5)
  async getStaleShipments(): Promise<{ count: number; maxDeliveryDays: number; shipments: ShipmentItem[] }> {
    const res = await api.get<{ success: boolean; count: number; maxDeliveryDays: number; shipments: ShipmentItem[] }>('/shipping-portal/shipments/stale');
    return {
      count: res.data.count || 0,
      maxDeliveryDays: res.data.maxDeliveryDays || 11,
      shipments: res.data.shipments || [],
    };
  },

  // Shipping Employees (SHIP-T5)
  async getEmployees(params: { isActive?: boolean; search?: string } = {}): Promise<ShippingEmployeeItem[]> {
    const res = await api.get<{ success: boolean; data: ShippingEmployeeItem[] }>('/v1/team/employees', { params });
    return res.data.data || [];
  },

  async createEmployee(data: Partial<ShippingEmployeeItem>): Promise<ShippingEmployeeItem> {
    const res = await api.post<{ success: boolean; employee: ShippingEmployeeItem }>('/v1/team/employees', data);
    return res.data.employee;
  },

  async updateEmployee(id: string, data: Partial<ShippingEmployeeItem>): Promise<ShippingEmployeeItem> {
    const res = await api.put<{ success: boolean; employee: ShippingEmployeeItem }>(`/v1/team/employees/${id}`, data);
    return res.data.employee;
  },

  async deleteEmployee(id: string): Promise<void> {
    await api.delete(`/v1/team/employees/${id}`);
  },

  async linkEmployeeUser(id: string, userId: string): Promise<ShippingEmployeeItem> {
    const res = await api.post<{ success: boolean; employee: ShippingEmployeeItem }>(`/v1/team/employees/${id}/link`, { userId });
    return res.data.employee;
  },

  async unlinkEmployeeUser(id: string): Promise<ShippingEmployeeItem> {
    const res = await api.post<{ success: boolean; employee: ShippingEmployeeItem }>(`/v1/team/employees/${id}/unlink`);
    return res.data.employee;
  },

  // Store Integrations (SHIP-T5)
  async getStoreIntegrations(): Promise<StoreIntegrationItem[]> {
    const res = await api.get<{ success: boolean; data: StoreIntegrationItem[] }>('/shipping-portal/integrations');
    return res.data.data || [];
  },

  async createStoreIntegration(data: any): Promise<StoreIntegrationItem> {
    const res = await api.post<{ success: boolean; integration: StoreIntegrationItem }>('/shipping-portal/integrations', data);
    return res.data.integration;
  },

  async updateStoreIntegration(id: string, data: any): Promise<StoreIntegrationItem> {
    const res = await api.patch<{ success: boolean; integration: StoreIntegrationItem }>(`/shipping-portal/integrations/${id}`, data);
    return res.data.integration;
  },

  async deleteStoreIntegration(id: string): Promise<void> {
    await api.delete(`/shipping-portal/integrations/${id}`);
  },

  async testStoreIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(`/shipping-portal/integrations/${id}/test`);
    return res.data;
  },

  async confirmOpenPackage(id: string, notes?: string): Promise<{ success: boolean; data: ShipmentItem; feeDeducted?: boolean; fee?: number }> {
    const res = await api.post<{ success: boolean; data: ShipmentItem; feeDeducted?: boolean; fee?: number }>(
      `/shipping-portal/shipments/${id}/confirm-open`,
      { notes }
    );
    return res.data;
  },

  async convertToInternational(
    shipmentId: string,
    data: {
      destinationCountry: string;
      destinationCityIntl?: string;
      customsValue: number;
      customerName?: string;
      contentDescription: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data: ShipmentItem; acknowledgment: any }> {
    const res = await api.post<{ success: boolean; data: ShipmentItem; acknowledgment: any }>(`/shipping-portal/shipments/${shipmentId}/international`, data);
    return res.data;
  },

  async getPendingInternational(): Promise<{ success: boolean; count: number; items: any[] }> {
    const res = await api.get<{ success: boolean; count: number; items: any[] }>('/shipping-portal/international/pending');
    return res.data;
  },

  async reviewInternationalAck(
    ackId: string,
    data: { status: 'APPROVED' | 'REJECTED'; notes?: string }
  ): Promise<{ success: boolean; data: any; shipment?: ShipmentItem }> {
    const res = await api.patch<{ success: boolean; data: any; shipment?: ShipmentItem }>(`/shipping-portal/international/${ackId}/review`, data);
    return res.data;
  },

  async collectShipmentCod(id: string, payload: { amount?: number; notes?: string } = {}): Promise<{ success: boolean; data: ShipmentItem }> {
    const res = await api.post<{ success: boolean; data: ShipmentItem }>(
      `/shipping-portal/shipments/${id}/collect`,
      payload
    );
    return res.data;
  },
};

export interface CompanyWalletData {
  id: string;
  companyId: string;
  balance: number;
  availableForRemittance: number;
  upcomingRemittance: number;
  currency: string;
  updatedAt?: string;
}

export interface CompanyWalletTransactionItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | string;
  typeLabel?: string;
  reason: 'COD_COLLECTED' | 'SETTLEMENT_PAYOUT' | 'PRINT_FEE' | 'OPEN_PACKAGE_FEE' | 'ADJUSTMENT' | 'COMMISSION_PAYOUT' | string;
  reasonLabel?: string;
  code?: string | null;
  amount: number;
  balanceAfter: number;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface WalletTransactionsResponse {
  transactions: CompanyWalletTransactionItem[];
  items?: CompanyWalletTransactionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  wallet?: CompanyWalletData;
}

export interface WalletFeesReport {
  from: string | null;
  to: string | null;
  totalFees: number;
  printFees: { count: number; total: number };
  openPackageFees: { count: number; total: number };
}

export interface ShippingEmployeeItem {
  id: string;
  companyId: string;
  userId?: string | null;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  photoUrl?: string | null;
  personalPhone?: string | null;
  workPhone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreIntegrationItem {
  id: string;
  companyId: string;
  platform: 'WOOCOMMERCE' | 'SHOPIFY' | string;
  storeUrl: string;
  webhookSecret?: string | null;
  isActive: boolean;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
  hasConsumerKey?: boolean;
  hasConsumerSecret?: boolean;
  hasAccessToken?: boolean;
}

export interface ShippingPolicyData {
  id?: string;
  companyId: string;
  printFeePerWaybill: number;
  openPackageMode: 'ALWAYS_ALLOW' | 'ASK_EACH' | 'ALWAYS_DENY' | string;
  openPackageFeeAlways: number;
  openPackageFeeAsk: number;
  openPackageFeeDeny: number;
  remittanceDays?: string[] | string;
  maxDeliveryDays?: number;
  [key: string]: any;
}

export interface DeliveryFailureReasonItem {
  id: string;
  companyId: string;
  code: string;
  labelAr: string;
  labelEn?: string | null;
  requiresReschedule: boolean;
  isActive: boolean;
}

export interface PublicTrackingResponse {
  waybill: string;
  trackingNumber: string;
  status: string;
  customerStatus?: string;
  customerStatusEn?: string;
  statusCategory?: string;
  statusColor?: string;
  recipientName: string;
  recipientPhone: string;
  destinationGovernorate: string;
  destinationCity?: string | null;
  updatedAt: string;
  createdAt: string;
  events: Array<{
    id: string;
    status: string;
    toStatus: string;
    statusLabel?: string;
    statusLabelEn?: string;
    fromStatus?: string | null;
    reasonCode?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
}


export interface InternationalAcknowledgmentItem {
  id: string;
  companyId: string;
  shipmentId: string;
  customerName: string;
  contentDescription: string;
  customsValue: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  shipment?: {
    id: string;
    trackingNumber: string;
    recipientName: string;
    destinationCountry?: string | null;
  };
}
