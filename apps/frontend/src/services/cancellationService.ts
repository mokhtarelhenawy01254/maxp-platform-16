import { apiClient } from "./apiClient";

export interface CancellationReasonCategory {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  reasons?: CancellationReason[];
}

export interface CancellationReason {
  id: string;
  reason: string;
  description?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  category?: CancellationReasonCategory;
}

export const cancellationService = {
  getCategories: () =>
    apiClient.get<CancellationReasonCategory[]>("/cancellations/categories"),
  createCategory: (data: { name: string }) =>
    apiClient.post("/cancellations/categories", data),
  updateCategory: (id: string, data: { name?: string; isActive?: boolean }) =>
    apiClient.put(`/cancellations/categories/${id}`, data),

  getReasons: () =>
    apiClient.get<CancellationReason[]>("/cancellations/reasons"),
  createReason: (data: {
    reason: string;
    description?: string;
    categoryId?: string;
  }) => apiClient.post("/cancellations/reasons", data),
  updateReason: (id: string, data: any) =>
    apiClient.put(`/cancellations/reasons/${id}`, data),
  deleteReason: (id: string) =>
    apiClient.delete(`/cancellations/reasons/${id}`),
};
