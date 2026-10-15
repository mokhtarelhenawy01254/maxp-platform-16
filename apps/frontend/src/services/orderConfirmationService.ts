import api from './api';

export interface OrderConfirmationSettings {
  enabled: boolean;
  requireSourceTypes: string[];
  requireStatuses: string[];
  requireMatchMode: string;
  confirmStatus: string;
  distributionEnabled: boolean;
  distributionStrategy: string;
  eligibleRoles: string[];
  eligibleUserIds: string[];
  regionRules: Record<string, string[]>;
  specialtyRules: Record<string, string[]>;
  orderValueRules: OrderConfirmationValueRule[];
  workloadMaxOpen?: number | null;
  workloadStatuses: string[];
  maxCallsNoAnswer: number;
  intervalMinutes: number;
  notifyOnNew: boolean;
  autoAssignOnConfirm: boolean;
}

export interface OrderConfirmationValueRule {
  minTotal: number | null;
  maxTotal: number | null;
  userIds: string[];
}

export interface OrderConfirmationUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role?: string | null;
  availability?: string | null;
}

export interface OrderConfirmationProduct {
  id: string;
  name: string;
  sku?: string | null;
}

export interface OrderConfirmationApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  disabled?: boolean;
}

export interface OrderConfirmationCallLogData {
  orderType: 'regular' | 'guest';
  callAttempts: number;
  nextCallAllowedAt: string | null;
  order: {
    lastCallAttemptAt?: string | null;
    lastCallAt?: string | null;
    orderNumber?: string;
  } | null;
}

export interface OrderConfirmationCancelPayload {
  type?: 'GUEST' | 'REGULAR';
  notes: string;
}

const orderConfirmationService = {
  getSettings: (): Promise<OrderConfirmationApiResponse<OrderConfirmationSettings>> =>
    api.get<OrderConfirmationApiResponse<OrderConfirmationSettings>>('/order-confirmation/settings').then((res) => res.data),
  updateSettings: (data: Partial<OrderConfirmationSettings>) =>
    api
      .put<OrderConfirmationApiResponse<OrderConfirmationSettings>, Partial<OrderConfirmationSettings>>(
        '/order-confirmation/settings',
        data
      )
      .then((res) => res.data),
  getEligibleUsers: (params?: Record<string, unknown>): Promise<OrderConfirmationApiResponse<OrderConfirmationUser[]>> =>
    api
      .get<OrderConfirmationApiResponse<OrderConfirmationUser[]>>('/order-confirmation/eligible-users', { params })
      .then((res) => res.data),
  getProducts: (params?: Record<string, unknown>): Promise<OrderConfirmationApiResponse<OrderConfirmationProduct[]>> =>
    api
      .get<OrderConfirmationApiResponse<OrderConfirmationProduct[]>>('/products', { params })
      .then((res) => res.data),
  getQueue: (params?: Record<string, any>) =>
    api.get('/order-confirmation/queue', { params }).then((res) => res.data),
  getStats: (params?: Record<string, any>) =>
    api.get('/order-confirmation/stats', { params }).then((res) => res.data),
  confirmOrder: (orderId: string, notes?: string) =>
    api.post('/order-confirmation/confirm', { orderId, notes }).then((res) => res.data),
  cancelOrder: (orderId: string, payload: OrderConfirmationCancelPayload) =>
    api
      .post(`/agent-workspace/orders/${orderId}/quick-action`, {
        action: 'cancel',
        type: payload.type || 'REGULAR',
        notes: payload.notes
      })
      .then((res) => res.data),
  confirmOrders: (orderIds: string[], notes?: string) =>
    api.post('/order-confirmation/confirm/bulk', { orderIds, notes }).then((res) => res.data),
  assignOrder: (orderId: string, userId: string, notes?: string, strategy?: string) =>
    api.post('/order-confirmation/assign', { orderId, userId, notes, strategy }).then((res) => res.data),
  assignOrders: (orderIds: string[], userId: string, notes?: string, strategy?: string) =>
    api.post('/order-confirmation/assign/bulk', { orderIds, userId, notes, strategy }).then((res) => res.data),
  logCall: (orderId: string, result?: string, notes?: string): Promise<OrderConfirmationApiResponse<OrderConfirmationCallLogData>> =>
    api
      .post<OrderConfirmationApiResponse<OrderConfirmationCallLogData>>('/order-confirmation/log-call', { orderId, result, notes })
      .then((res) => res.data)
};

export default orderConfirmationService;
