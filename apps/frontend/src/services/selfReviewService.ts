import { apiClient } from "./apiClient";

export interface ReviewLog {
  id: string;
  company_id: string;
  agent_id: string;
  agent_slug: string | null;
  status: string;
  violations: string[] | null;
  reason: string | null;
  model_used: string | null;
  latency_ms: number | null;
  reply_preview: string | null;
  created_at: string;
}

export interface ReviewStats {
  total: number;
  approved: number;
  rejected: number;
  corrected: number;
  skipped: number;
  approval_rate: number;
  avg_latency_ms: number;
  violations: { agent_id: string; agent_slug: string | null; violation: string; count: number }[];
  agents: { agent_id: string; agent_slug: string | null; total: number; approved: number; rejected: number; corrected: number; skipped: number }[];
  days: number;
}

export interface ReviewFilters {
  company_id?: string;
  agent_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  days?: number;
}

export interface PaginatedResponse {
  logs: ReviewLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const selfReviewService = {
  async getLogs(filters: ReviewFilters = {}): Promise<PaginatedResponse> {
    const res = await apiClient.get("/admin/self-review/logs", { params: filters });
    return res.data.data;
  },

  async getStats(filters: ReviewFilters = {}): Promise<ReviewStats> {
    const { company_id, agent_id, days } = filters;
    const res = await apiClient.get("/admin/self-review/stats", { params: { company_id, agent_id, days } });
    return res.data.data;
  },

  async exportCsv(filters: ReviewFilters = {}): Promise<Blob> {
    const res = await apiClient.get("/admin/self-review/logs/export", {
      params: filters,
      responseType: "blob",
    });
    return res.data;
  },

  async updateReviewModel(agentId: string, modelName: string): Promise<void> {
    await apiClient.patch(`/admin/self-review/agents/${agentId}/review-model`, { model: modelName });
  },
};
