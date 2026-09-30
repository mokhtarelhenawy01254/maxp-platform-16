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

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  reasonId?: string;
  adminNotes?: string;
  customerNotes?: string;
  refundAmount?: number;
  assignedTo?: string;
  responsibleParty?: "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER" | null;
  isReviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  trackingNumber?: string;
  shippingReturnCost?: number;
  settlementAmount?: number;
  returnTypeId?: string;
  shippingCompanyId?: string;
  returnType?: ReturnType;
  shippingCompany?: {
    id: string;
    name: string;
    slug?: string;
  };
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
    shippingCost?: number;
    shipping?: number;
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

export type ReturnTypeCode = "SENDER_PAYS" | "RECIPIENT_PAYS" | "CANCELLED" | "CUSTOM";
export type ReturnTypeCostModel = "FULL" | "NONE" | "FIXED";

export interface ReturnType {
  id: string;
  companyId: string;
  shippingCompanyId?: string;
  name: string;
  code: ReturnTypeCode;
  costModel: ReturnTypeCostModel;
  fixedAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shippingCompany?: {
    id: string;
    name: string;
    slug?: string;
  };
}

export interface ReturnShippingCompany {
  id: string;
  name: string;
  slug?: string;
  isActive: boolean;
  returnTypes: ReturnType[];
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
  deleteCategory: (id: string) => apiClient.delete(`/returns/categories/${id}`),

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
  getRatingHealth: () =>
    apiClient.get<{ success: boolean; data: CustomerRatingHealthData }>("/returns/settings/rating-health"),

  // Details & Logs
  addContactAttempt: (
    id: string,
    data: { method: string; result: string; notes?: string },
  ) => apiClient.post(`/returns/requests/${id}/contact`, data),
  getContactHistory: (id: string) =>
    apiClient.get<ContactAttempt[]>(`/returns/requests/${id}/contacts`),
  getActivityLog: (id: string) =>
    apiClient.get<ActivityLog[]>(`/returns/requests/${id}/activity`),

  // Return Types (أنواع المرتجع حسب شركة الشحن)
  getReturnTypes: (params?: { shippingCompanyId?: string; activeOnly?: boolean }) =>
    apiClient.get<{ success: boolean; data: ReturnType[] }>("/returns/return-types", {
      params,
    }),
  createReturnType: (data: {
    name: string;
    code: ReturnTypeCode;
    costModel: ReturnTypeCostModel;
    fixedAmount?: number;
    shippingCompanyId?: string;
  }) => apiClient.post<{ success: boolean; data: ReturnType }>("/returns/return-types", data),
  updateReturnType: (
    id: string,
    data: {
      name?: string;
      code?: ReturnTypeCode;
      costModel?: ReturnTypeCostModel;
      fixedAmount?: number | null;
      shippingCompanyId?: string;
      isActive?: boolean;
    },
  ) => apiClient.put<{ success: boolean; data: ReturnType }>(`/returns/return-types/${id}`, data),
  deleteReturnType: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/returns/return-types/${id}`),
  getReturnShippingCompanies: (params?: { activeOnly?: boolean }) =>
    apiClient.get<{ success: boolean; data: ReturnShippingCompany[] }>(
      "/returns/return-shipping-companies",
      { params },
    ),
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
  details: any;
  createdAt: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  returnRequestSummary?: {
    orderNumber?: string;
    turboTrackingNumber?: string;
    status?: string;
    isReviewed?: boolean;
  };
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
  showFinancialColumn?: boolean;
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

export interface CustomerRatingHealthData {
  companyId: string;
  totalCustomers: number;
  ratedCustomers: number;
  unratedCustomers: number;
  breakdown: {
    EXCELLENT: number;
    GOOD: number;
    AVERAGE: number;
    POOR: number;
    UNKNOWN: number;
  };
  rulesVersion: string;
  lastRunAt: string | null;
  failureCount: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  activeThresholds: {
    excellentThreshold: number;
    goodThreshold: number;
    averageThreshold: number;
    minOrdersForRating: number;
  };
}
