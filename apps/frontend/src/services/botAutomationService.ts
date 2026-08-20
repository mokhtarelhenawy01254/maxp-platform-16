import type { AxiosResponse } from "axios";
import { apiClient } from "./apiClient";

export type BotChannel = "WHATSAPP" | "FACEBOOK";
export type BotMatchMode = "CONTAINS" | "EXACT" | "REGEX";
export type BotReplyType = "TEXT" | "IMAGE" | "VIDEO";

export interface BotAutomationSettings {
  welcomeEnabled: boolean;
  welcomeMessage: string;
  defaultReplyEnabled: boolean;
  defaultReply: string;
  channels: BotChannel[];
  widgetEnabled: boolean;
  widgetColor: string;
}

export interface BotAutomationRule {
  id: string;
  name: string;
  channels: BotChannel[];
  matchMode: BotMatchMode;
  keywords: string[];
  replyType: BotReplyType;
  replyText: string;
  mediaUrl: string;
  buttons: { title: string; payload: string }[];
  priority: number;
  isEnabled: boolean;
  stopFurtherProcessing: boolean;
}

export type BotRuleInput = Omit<BotAutomationRule, "id">;

export interface BotConversationStarter {
  id: string;
  name: string;
  channels: BotChannel[];
  message: string;
  refCode: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface BotStarterLink {
  starterId: string;
  name: string;
  message: string;
  channels: {
    channel: BotChannel;
    url: string;
    phone?: string;
    pageId?: string;
    pageName?: string;
  }[];
}

export interface BotMenu {
  isEnabled: boolean;
  pageId: string | null;
  pageName: string | null;
  hasPageConnected: boolean;
  items: { type: "postback" | "web_url"; title: string; payload?: string; url?: string }[];
}

export interface SegmentRule {
  field: string;
  op: "eq" | "contains" | "gte" | "lte";
  value: string;
}

function getResponseData<T>(response: AxiosResponse): T | null {
  return (response.data as { success?: boolean; data?: T }).data ?? null;
}

export const botAutomationService = {
  async getSettings(): Promise<BotAutomationSettings | null> {
    const response = await apiClient.get("/bot-automation/settings");
    return getResponseData<BotAutomationSettings>(response);
  },

  async saveSettings(settings: Partial<BotAutomationSettings>): Promise<void> {
    await apiClient.put("/bot-automation/settings", settings);
  },

  async listRules(): Promise<BotAutomationRule[]> {
    const response = await apiClient.get("/bot-automation/rules");
    return getResponseData<BotAutomationRule[]>(response) ?? [];
  },

  async createRule(input: BotRuleInput): Promise<{ id: string } | null> {
    const response = await apiClient.post("/bot-automation/rules", input);
    return getResponseData<{ id: string }>(response);
  },

  async updateRule(id: string, input: BotRuleInput): Promise<void> {
    await apiClient.put(`/bot-automation/rules/${id}`, input);
  },

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete(`/bot-automation/rules/${id}`);
  },

  async listStarters(): Promise<BotConversationStarter[]> {
    const response = await apiClient.get("/bot-automation/starters");
    return getResponseData<BotConversationStarter[]>(response) ?? [];
  },

  async buildStarterLinks(): Promise<BotStarterLink[]> {
    const response = await apiClient.get("/bot-automation/starters/links");
    return getResponseData<BotStarterLink[]>(response) ?? [];
  },

  async createStarter(input: Omit<BotConversationStarter, "id">): Promise<void> {
    await apiClient.post("/bot-automation/starters", input);
  },

  async updateStarter(id: string, input: Omit<BotConversationStarter, "id">): Promise<void> {
    await apiClient.put(`/bot-automation/starters/${id}`, input);
  },

  async deleteStarter(id: string): Promise<void> {
    await apiClient.delete(`/bot-automation/starters/${id}`);
  },

  async getMenu(): Promise<BotMenu | null> {
    const response = await apiClient.get("/bot-automation/menu");
    return getResponseData<BotMenu>(response);
  },

  async saveMenu(input: {
    isEnabled: boolean;
    items: BotMenu["items"];
  }): Promise<{ push?: { success: boolean } }> {
    const response = await apiClient.put("/bot-automation/menu", input);
    const data = response.data as { push?: { success: boolean } } | undefined;
    return data?.push ? { push: data.push } : {};
  },

  async deleteMenu(): Promise<void> {
    await apiClient.delete("/bot-automation/menu");
  },

  async listUnsubscribers(): Promise<
    { id: string; customerId: string; channel: string; customerName: string; phone: string | null; unsubscribedAt: string }[]
  > {
    const response = await apiClient.get("/bot-automation/audience/unsubscribers");
    return getResponseData(response) ?? [];
  },

  async resubscribe(customerId: string, channel: string): Promise<void> {
    await apiClient.delete(`/bot-automation/audience/unsubscribers/${customerId}`, {
      params: { channel },
    });
  },

  async listCustomFields(): Promise<{ id: string; name: string; key: string }[]> {
    const response = await apiClient.get("/bot-automation/audience/fields");
    return getResponseData(response) ?? [];
  },

  async createCustomField(name: string): Promise<void> {
    await apiClient.post("/bot-automation/audience/fields", { name });
  },

  async deleteCustomField(id: string): Promise<void> {
    await apiClient.delete(`/bot-automation/audience/fields/${id}`);
  },

  async listSegments(): Promise<{ id: string; name: string; rules: SegmentRule[] }[]> {
    const response = await apiClient.get("/bot-automation/audience/segments");
    return getResponseData(response) ?? [];
  },

  async createSegment(name: string, rules: SegmentRule[]): Promise<void> {
    await apiClient.post("/bot-automation/audience/segments", { name, rules });
  },

  async updateSegment(id: string, name: string, rules: SegmentRule[]): Promise<void> {
    await apiClient.put(`/bot-automation/audience/segments/${id}`, { name, rules });
  },

  async deleteSegment(id: string): Promise<void> {
    await apiClient.delete(`/bot-automation/audience/segments/${id}`);
  },

  async previewSegment(id: string): Promise<{
    count: number;
    customers: { customerId: string; firstName: string; lastName: string; phone: string | null }[];
  }> {
    const response = await apiClient.get(`/bot-automation/audience/segments/${id}/preview`);
    return getResponseData(response) ?? { count: 0, customers: [] };
  },
};
