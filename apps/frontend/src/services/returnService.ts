import { apiClient } from "./apiClient";

export interface ReturnReason {
  id: string;
  reason: string;
  description?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  category?: ReturnReasonCategory;
}

export interface ReturnReasonCategory {
  id: string;
  name: string;
  defaultRole: "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER";
  isActive: boolean;
  createdAt: string;
  reasons?: ReturnReason[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ReturnReceivedStatus = "PENDING_RECEIVE" | "IN_TRANSIT" | "RECEIVED" | "INSPECTED" | "RESTOCKED";

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  reasonId?: string;
  adminNotes?: string;
  customerNotes?: string;
  refundAmount?: number;
  assignedTo?: string;
  responsibleParty: "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER";
  isReviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  trackingNumber?: string;
  receivedStatus?: ReturnReceivedStatus;
  receivedAt?: string;
  productCondition?: string;
  shippingReturnCost?: number;
  settlementAmount?: number;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    successScore: number;
    customerRating: string;
  };
  order?: {
    orderNumber: string;
    total: number;
    currency: string;
    turboTrackingNumber?: string;
    codDepositAmount?: number;
    codDepositPaid?: boolean;
    codDepositRefunded?: boolean;
  };
  reason?: ReturnReason;
  assignedUser?: {
    firstName: string;
    lastName: string;
  };
}

export const returnService = {
  getRequests: (params?: {
    status?: string;
    orderId?: string;
    customerId?: string;
    isReviewed?: boolean;
    search?: string;
    orderStatus?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<PaginatedResponse<ReturnRequest>>(
      "/returns/requests",
      { params },
    ),
  createRequest: (data: any) => apiClient.post("/returns/requests", data),
  updateRequest: (id: string, data: any) =>
    apiClient.put(`/returns/requests/${id}`, data),

  // Categories
  getCategories: () =>
    apiClient.get<ReturnReasonCategory[]>("/returns/categories"),
  createCategory: (data: { name: string; defaultRole: string }) =>
    apiClient.post("/returns/categories", data),
  updateCategory: (id: string, data: any) =>
    apiClient.put(`/returns/categories/${id}`, data),

  // Reasons (Updated with categoryId)
  getReasons: () => apiClient.get<ReturnReason[]>("/returns/reasons"),
  createReason: (data: {
    reason: string;
    description?: string;
    categoryId?: string;
  }) => apiClient.post("/returns/reasons", data),
  updateReason: (id: string, data: any) =>
    apiClient.put(`/returns/reasons/${id}`, data),
  deleteReason: (id: string) => apiClient.delete(`/returns/reasons/${id}`),

  // Settings
  getSettings: () => apiClient.get<ReturnSettingsData>("/returns/settings"),
  updateSettings: (data: any) =>
    apiClient.put<ReturnSettingsData>("/returns/settings", data),

  // Batch Operations
  batchReceive: (ids: string[], productCondition?: string) =>
    apiClient.put("/returns/batch/receive", { ids, productCondition }),

  // Details & Logs
  addContactAttempt: (
    id: string,
    data: { method: string; result: string; notes?: string },
  ) => apiClient.post(`/returns/requests/${id}/contact`, data),
  getContactHistory: (id: string) =>
    apiClient.get<ContactAttempt[]>(`/returns/requests/${id}/contacts`),
  getActivityLog: (id: string) =>
    apiClient.get<ActivityLog[]>(`/returns/requests/${id}/activity`),
};

export interface ContactAttempt {
  id: string;
  method: string;
  result: string;
  notes?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export interface ReviewDisplayConfig {
  showOrderColumn: boolean;
  showCustomerColumn: boolean;
  showCustomerRating: boolean;
  showCustomerSuccessScore: boolean;
  showCustomerPhone: boolean;
  showReasonColumn: boolean;
  showResponsiblePartyColumn: boolean;
  showReviewColumn: boolean;
  showDateColumn: boolean;
  showActionsColumn: boolean;
  showTrackingColumn?: boolean;
  showReceivedStatusColumn?: boolean;
  visibleOrderStatuses?: string[];
  ordersStartDate?: string;
}

export interface ReturnSettingsData {
  id: string;
  companyId: string;
  excellentThreshold: number;
  goodThreshold: number;
  minOrdersForRating: number;
  autoApproveScore: number;
  enableAutoApproval: boolean;
  reviewDisplayConfig: ReviewDisplayConfig;
  createdAt: string;
  updatedAt: string;
}
