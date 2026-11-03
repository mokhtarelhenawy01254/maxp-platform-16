/**
 * Shipping Reports Service (SHIP-W7)
 * Frontend client for operational shipping reports
 */

import api from './api';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface SummaryRow {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SummaryTotals {
  total: number;
  totalShipments: number;
  delivered: number;
  returned: number;
  failed: number;
  pending: number;
  inProgress: number;
  firstAttemptSuccessRate: number;
  rtoRate: number;
  avgDeliveryHours: number;
}

export interface SummaryReportResponse {
  success: boolean;
  range: DateRange;
  rows: SummaryRow[];
  totals: SummaryTotals;
  summary?: SummaryTotals;
  generatedAt: string;
}

export interface GovernorateRow {
  governorate: string;
  shipments: number;
  totalShipments: number;
  delivered: number;
  returned: number;
  failed: number;
  successRate: number;
  avgDeliveryHours: number;
}

export interface GovernorateTotals {
  totalShipments: number;
  shipments: number;
  delivered: number;
  returned: number;
  successRate: number;
  avgDeliveryHours: number;
}

export interface GovernorateReportResponse {
  success: boolean;
  range: DateRange;
  rows: GovernorateRow[];
  totals: GovernorateTotals;
  generatedAt: string;
}

export interface ClientRow {
  clientId: string | null;
  merchantId: string | null;
  clientName: string;
  name?: string;
  phone?: string | null;
  shipments: number;
  totalShipments: number;
  delivered: number;
  returned: number;
  codCollected: number;
  collected: number;
  shippingFees: number;
  fees: number;
  returnFees: number;
  returnedAmount: number;
  net: number;
  netPayout: number;
}

export interface ClientTotals {
  totalShipments: number;
  shipments: number;
  delivered: number;
  returned: number;
  codCollected: number;
  collected: number;
  shippingFees: number;
  fees: number;
  returnFees: number;
  returnedAmount: number;
  net: number;
  netPayout: number;
}

export interface ClientReportResponse {
  success: boolean;
  range: DateRange;
  rows: ClientRow[];
  totals: ClientTotals;
  generatedAt: string;
}

export interface CourierRow {
  courierId: string;
  courierName: string;
  name: string;
  phone?: string | null;
  shipments: number;
  totalShipments: number;
  delivered: number;
  returned: number;
  commissionsDue: number;
  commissionsPaid: number;
  due: number;
  paid: number;
  totalCommissions: number;
}

export interface CourierTotals {
  delivered: number;
  returned: number;
  commissionsDue: number;
  commissionsPaid: number;
  totalCommissions: number;
  due: number;
  paid: number;
}

export interface CourierReportResponse {
  success: boolean;
  range: DateRange;
  rows: CourierRow[];
  totals: CourierTotals;
  generatedAt: string;
}

export interface ProfitRow {
  key: string;
  name?: string;
  label?: string;
  shipments: number;
  revenue: number;
  courierCost: number;
  margin: number;
  marginPct: number;
}

export interface ProfitTotals {
  shipments: number;
  revenue: number;
  courierCost: number;
  margin: number;
  marginPct: number;
}

export interface ProfitReportResponse {
  success: boolean;
  groupBy: 'client' | 'governorate' | 'courier';
  range: DateRange;
  rows: ProfitRow[];
  totals: ProfitTotals;
  generatedAt: string;
}

export interface UncoveredProfitResponse {
  success: boolean;
  count: number;
  range: DateRange;
  shipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    cost: number;
    courierId?: string | null;
    courierName?: string | null;
    createdAt: string;
  }>;
}

export interface ReportQueryParams {
  from?: string;
  to?: string;
}

export const shippingReportsService = {
  async getSummary(params: ReportQueryParams = {}): Promise<SummaryReportResponse> {
    const res = await api.get<SummaryReportResponse>('/shipping-reports/summary', { params });
    return res.data;
  },

  async getByGovernorate(params: ReportQueryParams = {}): Promise<GovernorateReportResponse> {
    const res = await api.get<GovernorateReportResponse>('/shipping-reports/by-governorate', { params });
    return res.data;
  },

  async getByClient(params: ReportQueryParams = {}): Promise<ClientReportResponse> {
    const res = await api.get<ClientReportResponse>('/shipping-reports/by-client', { params });
    return res.data;
  },

  async getProfitReport(params: ReportQueryParams & { groupBy?: 'client' | 'governorate' | 'courier' } = {}): Promise<ProfitReportResponse> {
    const res = await api.get<ProfitReportResponse>('/shipping-reports/profit', { params });
    return res.data;
  },

  async getUncoveredProfit(params: ReportQueryParams = {}): Promise<UncoveredProfitResponse> {
    const res = await api.get<UncoveredProfitResponse>('/shipping-reports/profit/uncovered', { params });
    return res.data;
  },

  async recalcProfit(data: { from?: string; to?: string } = {}): Promise<{ success: boolean; updatedCount: number }> {
    const res = await api.post<{ success: boolean; updatedCount: number }>('/shipping-reports/profit/recalc', data);
    return res.data;
  },

  async getByCourier(params: ReportQueryParams = {}): Promise<CourierReportResponse> {
    const res = await api.get<CourierReportResponse>('/shipping-reports/by-courier', { params });
    return res.data;
  },
};
