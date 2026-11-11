import axios from 'axios';
import { config } from '../../../config';
import courierService, { DeliveryRun } from '../../../services/courierService';
import {
  portalSessionManager,
  type PortalCompanyOption,
} from '../../../utils/portalSessionManager';

export interface CourierUser {
  id: string;
  name: string;
  phone: string;
  companyId?: string;
  companyName?: string | null;
  vehicleType?: string;
  plateNumber?: string | null;
  status?: string;
}

export interface CourierKPIs {
  deliveredCount: number;
  pendingCount: number;
  returnedCount: number;
  totalCODExpected: number;
  totalCODCollected: number;
}

export interface FailureReason {
  code: string;
  label: string;
  description?: string;
}

export interface DeliveryRunSummary {
  id: string;
  runNumber: string;
  dispatchDate: string;
  status: 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'SETTLED' | 'CANCELLED';
  totalShipments: number;
  totalCODExpected: number;
  totalCODCollected: number;
  deliveredCount?: number;
  pendingCount?: number;
  returnedCount?: number;
  totalReturnedCount?: number;
}

export interface CustodySummary {
  totalCODExpected: number;
  totalCODCollected: number;
  difference: number;
  runs: DeliveryRunSummary[];
}

export interface CourierLoginResult {
  success: boolean;
  token?: string;
  courier?: CourierUser;
  company?: {
    id?: string;
    name?: string;
    slug?: string | null;
    logo?: string | null;
  } | null;
  requiresCompanySelection?: boolean;
  companies?: PortalCompanyOption[];
  code?: string;
  message?: string;
}

const TOKEN_KEY = 'courier_portal_token';
const USER_KEY = 'courier_portal_user';

export const getCourierToken = (): string | null => {
  return portalSessionManager.getActivePortalToken('courier');
};

export const setCourierToken = (token: string, persist = true): void => {
  try {
    if (persist) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // fallback ignore
  }
};

export const clearCourierToken = (): void => {
  portalSessionManager.clearPortalSession('courier');
};

export const getCourierUser = (): CourierUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCourierUser = (user: CourierUser): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // fallback ignore
  }
};

// Scoped axios instance for courier portal
const courierClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 25000,
  headers: {
    Accept: 'application/json',
  },
});

courierClient.interceptors.request.use((reqConfig) => {
  if (reqConfig.url?.startsWith('/')) {
    reqConfig.url = reqConfig.url.substring(1);
  }
  if (reqConfig.url?.startsWith('api/v1/')) {
    reqConfig.url = reqConfig.url.substring(7);
  }
  const subdomainHeaders = portalSessionManager.getPortalSubdomainHeaders();
  for (const [headerKey, headerValue] of Object.entries(subdomainHeaders)) {
    if (!reqConfig.headers[headerKey]) {
      reqConfig.headers[headerKey] = headerValue;
    }
  }
  const token = getCourierToken();
  if (token && !reqConfig.headers.Authorization) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

export const FALLBACK_FAILURE_REASONS: FailureReason[] = [
  { code: 'CUSTOMER_ABSENT', label: 'العميل غير متواجد' },
  { code: 'WRONG_ADDRESS', label: 'العنوان غير صحيح / غير واضح' },
  { code: 'PHONE_UNREACHABLE', label: 'الهاتف مغلق أو لا يرد' },
  { code: 'REFUSED', label: 'رفض الاستلام من قبل العميل' },
  { code: 'POSTPONED', label: 'طلب تأجيل الموعد' },
  { code: 'CASH_NOT_READY', label: 'المبلغ غير جاهز' },
  { code: 'CUSTOMER_UNAVAILABLE', label: 'العميل لا يجيب' },
  { code: 'OTHER', label: 'سبب آخر' },
];

export const courierPortalApi = {
  login: async (
    phone: string,
    pin: string,
    companyId?: string,
  ): Promise<CourierLoginResult> => {
    const res = await courierClient.post('/courier-portal/login', {
      phone,
      pin,
      ...(companyId ? { companyId } : {}),
    });
    const root = res.data || {};
    const payload = root.data || root || {};

    if (
      (root.requiresCompanySelection || payload.requiresCompanySelection) &&
      Array.isArray(root.companies || payload.companies)
    ) {
      const companies = portalSessionManager.normalizePortalCompanyOptions(
        root.companies || payload.companies,
      );
      return {
        success: false,
        requiresCompanySelection: true,
        companies,
        code: root.code || payload.code,
        message: root.message || payload.message,
      };
    }

    const token: string | undefined = payload.token || root.token;
    const courier: CourierUser | undefined = payload.courier || root.courier;
    const company = payload.company || root.company || null;

    if (!root.success || !token) {
      return {
        success: false,
        code: root.code || payload.code,
        message: root.message || root.error || payload.message || 'تعذر تسجيل الدخول',
      };
    }

    portalSessionManager.savePortalSession({
      role: 'courier',
      companyId: company?.id || courier?.companyId || companyId || null,
      companySlug: company?.slug || null,
      companyName: company?.name || courier?.companyName || null,
      token,
      profile: courier ?? null,
    });

    return { success: true, token, courier, company };
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      await courierClient.post('/courier-portal/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      clearCourierToken();
    }
    return { success: true };
  },

  getMe: async (): Promise<{
    success: boolean;
    courier: CourierUser;
    todayRuns: DeliveryRunSummary[];
    kpis: CourierKPIs;
  }> => {
    const res = await courierClient.get('/courier-portal/me');
    const data = res.data?.data || res.data || {};
    const courier = data.courier || getCourierUser() || { id: '', name: '', phone: '' };
    const todayRuns: DeliveryRunSummary[] = data.todayRuns || data.activeRuns || [];

    // Calculate live KPIs
    let deliveredCount = 0;
    let returnedCount = 0;
    let pendingCount = 0;
    let totalCODExpected = 0;
    let totalCODCollected = 0;

    for (const r of todayRuns) {
      totalCODExpected += Number(r.totalCODExpected || 0);
      totalCODCollected += Number(r.totalCODCollected || 0);
      returnedCount += Number(r.totalReturnedCount ?? r.returnedCount ?? 0);
      const del = Number(r.deliveredCount ?? 0);
      deliveredCount += del;
      const total = Number(r.totalShipments ?? 0);
      pendingCount += Math.max(0, total - del - Number(r.totalReturnedCount ?? r.returnedCount ?? 0));
    }

    const kpis: CourierKPIs = data.kpis || {
      deliveredCount,
      pendingCount,
      returnedCount,
      totalCODExpected,
      totalCODCollected,
    };

    return {
      success: true,
      courier,
      todayRuns,
      kpis,
    };
  },

  getTodayRuns: async (): Promise<{ success: boolean; data: DeliveryRunSummary[] }> => {
    const me = await courierPortalApi.getMe();
    return { success: true, data: me.todayRuns };
  },

  getRun: async (runId: string): Promise<{ success: boolean; data: DeliveryRun }> => {
    const token = getCourierToken() || undefined;
    return courierService.getDeliveryRun(runId, token);
  },

  getFailureReasons: async (): Promise<{ success: boolean; data: FailureReason[] }> => {
    try {
      const res = await courierClient.get('/courier-portal/failure-reasons');
      const list = res.data?.data || res.data;
      if (Array.isArray(list) && list.length > 0) {
        return {
          success: true,
          data: list.map((it: any) => ({
            code: it.code,
            label: it.labelAr || it.label || it.name || it.code,
            description: it.labelEn,
          })),
        };
      }
      return { success: true, data: FALLBACK_FAILURE_REASONS };
    } catch {
      return { success: true, data: FALLBACK_FAILURE_REASONS };
    }
  },

  updateDeliveryAction: async (
    runId: string,
    shipmentId: string,
    payload: {
      status: 'DELIVERED' | 'FAILED' | 'DELAYED' | 'RETURNED';
      collectedAmount?: number;
      otp?: string;
      failureReasonCode?: string;
      notes?: string;
      nextAttemptDate?: string;
    }
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const token = getCourierToken() || undefined;
    return courierService.updateShipmentStatus(
      runId,
      shipmentId,
      {
        status: payload.status,
        collectedAmount: payload.collectedAmount,
        deliveryNotes: payload.notes || payload.failureReasonCode,
        otp: payload.otp,
      },
      token
    );
  },

  syncDeliveryActions: async (
    actions: any[]
  ): Promise<{ success: boolean; synced: number; results?: any[]; message?: string }> => {
    const res = await courierClient.post('/courier-portal/sync', { events: actions });
    const data = res.data?.data || res.data || {};
    const synced =
      data.accepted ??
      (Array.isArray(data.results)
        ? data.results.filter((r: any) => r.status === 'accepted').length
        : actions.length);
    return { success: true, synced, results: data.results };
  },

  verifyLinkPin: async (payload: {
    runId: string;
    pin: string;
    token?: string;
  }): Promise<{ success: boolean; token: string; sessionToken?: string; message?: string }> => {
    const res = await courierClient.post('/courier-portal/verify-link-pin', payload);
    const data = res.data?.data || res.data || {};
    const token = data.token || res.data?.token;
    return {
      success: true,
      token,
      sessionToken: token,
      message: res.data?.message || 'تم التحقق من الـ PIN بنجاح',
    };
  },

  getCustodySummary: async (): Promise<{ success: boolean; data: CustodySummary }> => {
    const me = await courierPortalApi.getMe();
    const runs = me.todayRuns || [];
    let totalCODExpected = 0;
    let totalCODCollected = 0;
    for (const r of runs) {
      totalCODExpected += Number(r.totalCODExpected || 0);
      totalCODCollected += Number(r.totalCODCollected || 0);
    }
    const difference = totalCODCollected;
    return {
      success: true,
      data: {
        totalCODExpected,
        totalCODCollected,
        difference,
        runs,
      },
    };
  },
};

export default courierPortalApi;
