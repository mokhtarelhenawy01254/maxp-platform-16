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
};
