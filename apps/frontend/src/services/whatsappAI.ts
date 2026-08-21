import { apiClient } from "./apiClient";

export interface WhatsAppAIIgnoreEntry {
  id: string;
  companyId: string;
  phoneNumber: string;
  label: string | null;
  notes: string | null;
  addedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAIIgnoreStats {
  total: number;
  skippedToday: number;
  skippedThisWeek: number;
  skippedAllTime: number;
}

export interface BulkAddItem {
  companyId: string;
  phoneNumber: string;
  label?: string;
  notes?: string;
}

export interface BulkAddResult {
  inserted: number;
  skipped: number;
  entries: WhatsAppAIIgnoreEntry[];
}

const BASE = "/whatsapp-ai-ignore-list";

export const whatsappAIService = {
  list: async (companyId: string): Promise<WhatsAppAIIgnoreEntry[]> => {
    const response = await apiClient.get<WhatsAppAIIgnoreEntry[]>(BASE, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  add: async (
    companyId: string,
    phoneNumber: string,
    label?: string,
    notes?: string,
  ): Promise<WhatsAppAIIgnoreEntry> => {
    const response = await apiClient.post<WhatsAppAIIgnoreEntry>(BASE, {
      companyId,
      phoneNumber,
      label,
      notes,
    });
    return response.data;
  },

  update: async (
    id: string,
    companyId: string,
    patch: { label?: string; notes?: string },
  ): Promise<WhatsAppAIIgnoreEntry> => {
    const response = await apiClient.patch<WhatsAppAIIgnoreEntry>(
      `${BASE}/${id}`,
      patch,
      { params: { company_id: companyId } },
    );
    return response.data;
  },

  remove: async (id: string, companyId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`, { params: { company_id: companyId } });
  },

  bulkAdd: async (items: BulkAddItem[]): Promise<BulkAddResult> => {
    const companyId = items[0]?.companyId;
    const response = await apiClient.post<BulkAddResult>(`${BASE}/bulk`, {
      companyId,
      items,
    });
    return response.data;
  },

  stats: async (companyId: string): Promise<WhatsAppAIIgnoreStats> => {
    const response = await apiClient.get<WhatsAppAIIgnoreStats>(
      `${BASE}/stats`,
      { params: { company_id: companyId } },
    );
    return response.data;
  },
};
