import api from './api';

export interface Courier {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  nationalId?: string | null;
  vehicleType: string;
  plateNumber?: string | null;
  governorates?: string | null;
  commissionType: string;
  commissionAmount: number;
  isActive: boolean;
  status: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY';
  notes?: string | null;
  activeShipmentsCount: number;
  expectedCashInTransit: number;
  pendingSettlementCash: number;
  deliveredCount: number;
  returnedCount: number;
  successRate: number;
  createdAt: string;
  _count?: {
    shipments: number;
    deliveryRuns: number;
  };
}

export interface CourierInput {
  name: string;
  phone: string;
  nationalId?: string;
  vehicleType?: string;
  plateNumber?: string;
  governorates?: string | string[];
  commissionType?: string;
  commissionAmount?: number;
  isActive?: boolean;
  notes?: string;
}

export interface DeliveryRunItem {
  id: string;
  orderId?: string | null;
  status: string;
  settlementStatus: string;
  collectedAmount?: number | null;
  destinationGovernorate?: string | null;
  destinationCity?: string | null;
  destinationAddress?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string | null;
    governorate?: string | null;
    city?: string | null;
    customerAddress?: string | null;
    shippingAddress?: string | null;
    total: number;
    shipping: number;
    status: string;
    items?: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
      variantTitle?: string;
    }>;
  } | null;
}

export interface DeliveryRun {
  id: string;
  runNumber: string;
  courierId: string;
  status: 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'SETTLED' | 'CANCELLED';
  dispatchDate: string;
  totalShipments: number;
  totalCODExpected: number;
  totalCODCollected: number;
  totalReturnedCount: number;
  deliveredCount?: number;
  returnedCount?: number;
  pendingCount?: number;
  notes?: string | null;
  settledAt?: string | null;
  settledBy?: string | null;
  treasuryAccountId?: string | null;
  treasuryTransactionId?: string | null;
  createdAt: string;
  courier?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    plateNumber?: string | null;
    commissionAmount?: number;
  };
  shipments?: DeliveryRunItem[];
}

export interface CourierDashboardSummary {
  totalCouriers: number;
  activeCouriers: number;
  availableCouriers: number;
  totalParcelsInField: number;
  totalExpectedCashInField: number;
  totalCashAwaitingRemittance: number;
}

const courierService = {
  getSummary: (): Promise<{ success: boolean; data: CourierDashboardSummary }> =>
    api.get<{ success: boolean; data: CourierDashboardSummary }>('/couriers/dashboard-summary').then((r) => r.data),

  getCouriers: (params?: { search?: string; status?: string; isActive?: boolean }): Promise<{ success: boolean; data: Courier[] }> =>
    api.get<{ success: boolean; data: Courier[] }>('/couriers', { params }).then((r) => r.data),

  getCourier: (id: string): Promise<{ success: boolean; data: Courier }> =>
    api.get<{ success: boolean; data: Courier }>(`/couriers/${id}`).then((r) => r.data),

  createCourier: (data: CourierInput): Promise<{ success: boolean; data: Courier }> =>
    api.post<{ success: boolean; data: Courier }>('/couriers', data).then((r) => r.data),

  updateCourier: (id: string, data: Partial<CourierInput>): Promise<{ success: boolean; message: string }> =>
    api.put<{ success: boolean; message: string }>(`/couriers/${id}`, data).then((r) => r.data),

  deleteCourier: (id: string): Promise<{ success: boolean; message: string }> =>
    api.delete<{ success: boolean; message: string }>(`/couriers/${id}`).then((r) => r.data),

  getDeliveryRuns: (params?: { courierId?: string; status?: string; dateFrom?: string; dateTo?: string; search?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: DeliveryRun[]; pagination: { total: number; page: number; limit: number; pages: number } }> =>
    api.get('/couriers/runs', { params }).then((r) => r.data),

  getDeliveryRun: (id: string): Promise<{ success: boolean; data: DeliveryRun }> =>
    api.get<{ success: boolean; data: DeliveryRun }>(`/couriers/runs/${id}`).then((r) => r.data),

  createDeliveryRun: (payload: { courierId: string; shipmentIds?: string[]; orderIds?: string[]; notes?: string }): Promise<{ success: boolean; data: DeliveryRun }> =>
    api.post<{ success: boolean; data: DeliveryRun }>('/couriers/runs', payload).then((r) => r.data),

  updateShipmentStatus: (runId: string, shipmentId: string, payload: { status: string; collectedAmount?: number; deliveryNotes?: string }): Promise<{ success: boolean; data: any }> =>
    api.patch(`/couriers/runs/${runId}/shipments/${shipmentId}`, payload).then((r) => r.data),

  settleDeliveryRun: (runId: string, payload: { treasuryAccountId?: string; actualCashReceived: number; notes?: string }): Promise<{ success: boolean; data: any; message: string }> =>
    api.post(`/couriers/runs/${runId}/settle`, payload).then((r) => r.data),

  getTreasuryAccounts: (): Promise<{ success: boolean; data: Array<{ id: string; name: string; type: string; balance: number }> }> =>
    api.get('/treasury/accounts').then((r) => r.data).catch(() => ({ success: true, data: [] }))
};

export default courierService;
