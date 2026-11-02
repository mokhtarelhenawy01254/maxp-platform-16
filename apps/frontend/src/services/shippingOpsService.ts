import api from './api';

export interface ShipmentItem {
  id: string;
  companyId: string;
  trackingNumber: string;
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
  source: 'RATE_CARD' | 'ZONE' | 'NONE';
  rateCardId?: string;
  rateCardName?: string;
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
  page?: number;
  limit?: number;
}

export interface ShipmentsResponse {
  data: ShipmentItem[];
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
    const res = await api.get<{ success: boolean; data: ShipmentItem[]; pagination: ShipmentsResponse['pagination'] }>(
      '/shipping-portal/shipments',
      { params }
    );
    return {
      data: res.data.data || [],
      pagination: res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
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

  // Telemetry & Helpers
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/shipping-portal/stats');
    return res.data.data;
  },

  async getMerchants(): Promise<MerchantItem[]> {
    const res = await api.get<{ success: boolean; data: MerchantItem[] }>('/shipping-portal/merchants');
    return res.data.data || [];
  },
};
