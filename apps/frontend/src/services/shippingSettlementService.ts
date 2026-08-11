import api from './api';

export interface SettlementCompanySummary {
  company: { id: string; name: string; providerKey: string };
  totalShipments: number;
  deliveredShipments: number;
  pendingAmount: number;
  settledShipments: number;
  settledAmount: number;
}

export interface SettlementOrder {
  id: string;
  trackingNumber: string | null;
  externalShipmentId: string | null;
  shipmentStatus: string;
  cost: number;
  createdAt: string;
  settlementStatus: string;
  settledAt: string | null;
  delivered: boolean;
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string | null;
    total: number;
    shipping: number;
    status: string;
  } | null;
}

export interface SettlementListResponse {
  success: boolean;
  data: SettlementOrder[];
  pagination?: { total: number; page: number; limit: number; pages: number };
}

const shippingSettlementService = {
  getSummary: (): Promise<{ success: boolean; data: SettlementCompanySummary[] }> =>
    api.get<{ success: boolean; data: SettlementCompanySummary[] }>('/shipping-settlement/summary').then((res) => res.data),
  getOrders: (params?: Record<string, any>): Promise<SettlementListResponse> =>
    api.get<SettlementListResponse>('/shipping-settlement/orders', { params }).then((res) => res.data),
  settle: (payload: { shippingCompanyId?: string; shipmentIds?: string[]; settlementDate?: string }): Promise<{ success: boolean; data: { updated: number } }> =>
    api.post<{ success: boolean; data: { updated: number } }>('/shipping-settlement/settle', payload).then((res) => res.data),
  unsettle: (shipmentIds: string[]): Promise<{ success: boolean; data: { updated: number } }> =>
    api.post<{ success: boolean; data: { updated: number } }>('/shipping-settlement/unsettle', { shipmentIds }).then((res) => res.data)
};

export default shippingSettlementService;
