import { apiClient } from './apiClient';

export interface AgentReportType {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  reportsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentReportItem {
  id: string;
  companyId: string;
  typeId: string;
  title: string;
  slug: string;
  periodLabel?: string | null;
  summary?: string | null;
  sizeBytes: number;
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  type?: {
    id: string;
    slug: string;
    name: string;
    icon?: string | null;
  };
}

export interface AgentReportDetail extends AgentReportItem {
  html: string;
}

export interface CreateReportInput {
  typeId?: string;
  typeSlug?: string;
  title: string;
  periodLabel?: string;
  summary?: string;
  html: string;
}

export interface CreateTypeInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export const agentReportsService = {
  async getTypes(): Promise<AgentReportType[]> {
    const res = await apiClient.get<{ success: boolean; data: AgentReportType[] }>('/api/v1/agent-reports/types');
    return res.data?.data || [];
  },

  async createType(input: CreateTypeInput): Promise<AgentReportType> {
    const res = await apiClient.post<{ success: boolean; data: AgentReportType }>('/api/v1/agent-reports/types', input);
    return res.data?.data;
  },

  async updateType(id: string, input: Partial<CreateTypeInput>): Promise<AgentReportType> {
    const res = await apiClient.patch<{ success: boolean; data: AgentReportType }>(`/api/v1/agent-reports/types/${id}`, input);
    return res.data?.data;
  },

  async deleteType(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/agent-reports/types/${id}`);
  },

  async getReports(params?: { typeId?: string; q?: string; limit?: number; offset?: number }): Promise<{ items: AgentReportItem[]; total: number }> {
    const res = await apiClient.get<{ success: boolean; data: { items: AgentReportItem[]; total: number } }>('/api/v1/agent-reports/reports', {
      params,
    });
    return res.data?.data || { items: [], total: 0 };
  },

  async getReportById(id: string): Promise<AgentReportDetail> {
    const res = await apiClient.get<{ success: boolean; data: AgentReportDetail }>(`/api/v1/agent-reports/reports/${id}`);
    return res.data?.data;
  },

  async createReport(input: CreateReportInput): Promise<AgentReportDetail> {
    const res = await apiClient.post<{ success: boolean; data: AgentReportDetail }>('/api/v1/agent-reports/reports', input);
    return res.data?.data;
  },

  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/agent-reports/reports/${id}`);
  },

  getReportHtmlUrl(id: string): string {
    return `/api/v1/agent-reports/reports/${id}/html`;
  },
};
