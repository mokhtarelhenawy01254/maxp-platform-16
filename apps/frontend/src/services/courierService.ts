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
  documentsStatus?: 'INCOMPLETE' | 'PENDING_REVIEW' | 'VERIFIED';
  hireDate?: string | null;
  salaryBase?: number | null;
  compensationModel?: string | null;
  bonusPerOrder?: number | null;
  bonusStartsAfterOrders?: number | null;
  bonusTiers?: string | null;
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

export interface CourierDocument {
  id: string;
  companyId: string;
  courierId: string;
  type: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiryDate?: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourierPayroll {
  id: string;
  companyId: string;
  courierId: string;
  month: string;
  compensationModel: string;
  baseSalary: number;
  bonus: number;
  commission: number;
  deductions: number;
  netPayable: number;
  deliveredOrdersCount: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
  calculationDetails?: string | null;
  treasuryAccountId?: string | null;
  treasuryTransactionId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  paidBy?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  courier?: {
    id: string;
    name: string;
    phone: string;
    documentsStatus?: string;
  };
}

export interface PayrollTotals {
  totalBaseSalary: number;
  totalBonus: number;
  totalCommission: number;
  totalDeductions: number;
  totalNetPayable: number;
  totalDeliveredOrders: number;
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
  documentsStatus?: 'INCOMPLETE' | 'PENDING_REVIEW' | 'VERIFIED';
  hireDate?: string | null;
  salaryBase?: number | null;
  compensationModel?: string | null;
  bonusPerOrder?: number | null;
  bonusStartsAfterOrders?: number | null;
  bonusTiers?: string | null;
  settledAt?: string | null;
  settledBy?: string | null;
  treasuryAccountId?: string | null;
  treasuryTransactionId?: string | null;
  mobileToken?: string | null;
  /** Fleet setting requires a field PIN and this courier has one — mobile page must collect it */
  pinRequired?: boolean;
  /** Fleet setting requires the customer's OTP code to mark parcels DELIVERED */
  otpRequired?: boolean;
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

export interface CourierCommissionEntry {
  id: string;
  courierId: string;
  deliveryRunId?: string | null;
  shipmentId?: string | null;
  orderId?: string | null;
  commissionType: string;
  amount: number;
  status: 'DUE' | 'PAID';
  paidAt?: string | null;
  notes?: string | null;
  documentsStatus?: 'INCOMPLETE' | 'PENDING_REVIEW' | 'VERIFIED';
  hireDate?: string | null;
  salaryBase?: number | null;
  compensationModel?: string | null;
  bonusPerOrder?: number | null;
  bonusStartsAfterOrders?: number | null;
  bonusTiers?: string | null;
  createdAt: string;
  courier?: { id: string; name: string; phone: string };
}

export interface CourierCommissionSummaryRow {
  courierId: string;
  name: string;
  phone: string | null;
  dueAmount: number;
  dueCount: number;
  paidAmount: number;
  paidCount: number;
}

export interface CourierPerformanceRow {
  courierId: string;
  name: string;
  phone: string;
  isActive: boolean;
  deliveredCount: number;
  returnedCount: number;
  openCount: number;
  collectedCash: number;
  successRate: number | null;
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

  setCourierPin: (id: string, pin: string | null): Promise<{ success: boolean; message: string; data?: { pinSet: boolean } }> =>
    api.put(`/couriers/${id}/pin`, { pin }).then((r) => r.data),

  getCommissions: (params?: { courierId?: string; status?: string; page?: number; limit?: number }): Promise<{
    success: boolean;
    summary: CourierCommissionSummaryRow[];
    data: CourierCommissionEntry[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> =>
    api.get('/couriers/commissions', { params }).then((r) => r.data),

  payCommissions: (courierId: string, payload?: { treasuryAccountId?: string; notes?: string }): Promise<{
    success: boolean;
    message: string;
    data: { courierId: string; courierName: string; paidCount: number; total: number };
  }> =>
    api.post(`/couriers/commissions/${courierId}/pay`, payload || {}).then((r) => r.data),

  getPerformance: (params?: { from?: string; to?: string }): Promise<{
    success: boolean;
    data: {
      range: { from: string | null; to: string | null };
      totals: { delivered: number; returned: number; collectedCash: number };
      rows: CourierPerformanceRow[];
    };
  }> =>
    api.get('/couriers/performance', { params }).then((r) => r.data),

  reassignShipments: (shipmentIds: string[], toCourierId: string): Promise<{
    success: boolean;
    message: string;
    data: { moved: number; toCourier: { id: string; name: string } };
  }> =>
    api.post('/couriers/shipments/reassign', { shipmentIds, toCourierId }).then((r) => r.data),

  getDeliveryRuns: (params?: { courierId?: string; status?: string; dateFrom?: string; dateTo?: string; search?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: DeliveryRun[]; pagination: { total: number; page: number; limit: number; pages: number } }> =>
    api.get('/couriers/runs', { params }).then((r) => r.data),

  getDeliveryRun: (id: string, token?: string): Promise<{ success: boolean; data: DeliveryRun }> => {
    const requestConfig: any = {};
    if (token) {
      requestConfig.headers = { Authorization: `Bearer ${token}` };
      requestConfig.params = { token };
    }
    return api.get<{ success: boolean; data: DeliveryRun }>(`/couriers/runs/${id}`, requestConfig).then((r) => r.data);
  },

  revokeRunLink: (runId: string): Promise<{ success: boolean; message: string; mobileTokenVersion: number }> =>
    api.post<{ success: boolean; message: string; mobileTokenVersion: number }>(`/couriers/runs/${runId}/revoke-link`).then((r) => r.data),

  getRunShareLink: (id: string): Promise<{ success: boolean; data: { runId: string; runNumber: string; mobileToken: string; shareUrl: string; courierPhone?: string; courierName?: string } }> =>
    api.get(`/couriers/runs/${id}/share-link`).then((r) => r.data),

  createDeliveryRun: (payload: { courierId: string; shipmentIds?: string[]; orderIds?: string[]; notes?: string }): Promise<{ success: boolean; data: DeliveryRun }> =>
    api.post<{ success: boolean; data: DeliveryRun }>('/couriers/runs', payload).then((r) => r.data),

  updateShipmentStatus: (runId: string, shipmentId: string, payload: { status: string; collectedAmount?: number; deliveryNotes?: string; pin?: string; otp?: string }, token?: string): Promise<{ success: boolean; data: any }> => {
    const requestConfig: any = {};
    if (token) {
      requestConfig.headers = { Authorization: `Bearer ${token}` };
      requestConfig.params = { token };
    }
    return api.patch(`/couriers/runs/${runId}/shipments/${shipmentId}`, payload, requestConfig).then((r) => r.data);
  },

  settleDeliveryRun: (runId: string, payload: { treasuryAccountId?: string; actualCashReceived: number; notes?: string }): Promise<{ success: boolean; data: any; message: string }> =>
    api.post(`/couriers/runs/${runId}/settle`, payload).then((r) => r.data),

  getTreasuryAccounts: (): Promise<{ success: boolean; data: Array<{ id: string; name: string; type: string; balance: number }> }> =>
    api.get('/treasury/accounts').then((r) => r.data).catch(() => ({ success: true, data: [] })),

  getFleetSettings: async (): Promise<{
    general?: { runCodePrefix?: string; autoPrintManifestOnDispatch?: boolean; includeCustomerPhoneInManifest?: boolean };
    remittance?: { defaultTreasuryAccountId?: string; shortagePolicy?: string; allowPartialRemittance?: boolean; requireTreasuryNoteOnVariance?: boolean };
    fieldWorkflow?: { requireCourierPin?: boolean; autoUpdateOrderStatusOnDelivery?: boolean; allowPartialDelivery?: boolean; requirePhotoProofOnReturn?: boolean };
    commission?: { defaultType?: string; defaultValue?: number };
  } | null> => {
    try {
      const res = await api.get('/my-apps');
      const apps = Array.isArray(res?.data?.data) ? res.data.data : [];
      const fleetApp = apps.find((a: any) => a?.app?.slug === 'internal-courier-fleet');
      return (fleetApp?.settings as any) || null;
    } catch {
      return null;
    }
  },


  // Courier Documents
  listDocuments: (courierId: string): Promise<{ success: boolean; data: { courier: { id: string; name: string; documentsStatus: string }; documents: CourierDocument[] } }> =>
    api.get(`/couriers/${courierId}/documents`).then((r) => r.data),

  uploadDocument: (courierId: string, formData: FormData): Promise<{ success: boolean; data: { document: CourierDocument; documentsStatus: string } }> =>
    api.post(`/couriers/${courierId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  updateDocumentStatus: (courierId: string, docId: string, payload: { status: string; notes?: string }): Promise<{ success: boolean; data: { document: CourierDocument; documentsStatus: string } }> =>
    api.patch(`/couriers/${courierId}/documents/${docId}/status`, payload).then((r) => r.data),

  deleteDocument: (courierId: string, docId: string): Promise<{ success: boolean; data: { deletedId: string; documentsStatus: string } }> =>
    api.delete(`/couriers/${courierId}/documents/${docId}`).then((r) => r.data),

  // Courier Payroll & Compensation
  runPayroll: (month?: string): Promise<{ success: boolean; data: { month: string; createdCount: number; payrolls: CourierPayroll[] } }> =>
    api.post('/couriers/payroll/run', {}, { params: { month } }).then((r) => r.data),

  listPayroll: (month?: string): Promise<{ success: boolean; data: { month: string; totals: PayrollTotals; payrolls: CourierPayroll[] } }> =>
    api.get('/couriers/payroll', { params: { month } }).then((r) => r.data),

  approvePayroll: (payrollId: string): Promise<{ success: boolean; data: CourierPayroll }> =>
    api.post(`/couriers/payroll/${payrollId}/approve`).then((r) => r.data),

  payPayroll: (payrollId: string, payload?: { treasuryAccountId?: string; notes?: string }): Promise<{ success: boolean; data: CourierPayroll }> =>
    api.post(`/couriers/payroll/${payrollId}/pay`, payload || {}).then((r) => r.data),

  previewCompensation: (payload: any): Promise<{ success: boolean; data: any }> =>
    api.post('/couriers/compensation/preview', payload).then((r) => r.data)
};

export default courierService;
