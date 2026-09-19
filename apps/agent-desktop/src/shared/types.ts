// Shared types for MaxP Agent Studio

export type AgentRole = 
  | 'MEDIA_BUYER'
  | 'ORDER_CONFIRMATION'
  | 'CREATIVE_STUDIO'
  | 'INVENTORY_PRICING'
  | 'SALES_REP'
  | 'GENERAL_ASSISTANT';

export interface AgentInfo {
  id: string;
  slug: string;
  name: string;
  role: AgentRole;
  icon: string;
  description?: string;
  model: string;
  status: 'ACTIVE' | 'IDLE' | 'BUSY';
  badge?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  imageUrl?: string;
  category?: string;
}

export interface CampaignDraft {
  id: string;
  productName: string;
  angleTitle: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  budgetAmount: number;
  currency: string;
  targetAudience: string;
  format: string;
  status: 'DRAFT' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  agentSlug?: string;
  text: string;
  timestamp: string;
  telemetry?: {
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
  };
  card?: {
    type: 'CAMPAIGN_DRAFT' | 'ORDER_ALERT' | 'DECISION_CHIP' | 'VIDEO_PREVIEW';
    data: any;
  };
  screenContextSnippet?: string; // base64 thumbnail if captured
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  companyName?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  serverUrl: string;
}

export const IPC_CHANNELS = {
  // Auth
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_AUTH_STATE: 'auth:get-state',
  GET_TOKEN: 'auth:get-token',

  // Agents & Studio
  GET_AGENTS: 'agent:get-agents',
  SEND_AGENT_MESSAGE: 'agent:send-message',
  GET_PRODUCTS: 'agent:get-products',
  GET_CAMPAIGNS: 'agent:get-campaigns',
  TRIGGER_ACTION: 'agent:trigger-action',

  // OS & System
  CAPTURE_SCREEN: 'os:capture-screen',
  GET_ACTIVE_WINDOW: 'os:get-active-window',
  OPEN_EXTERNAL: 'os:open-external',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // Updater
  CHECK_FOR_UPDATES: 'update:check',
  QUIT_AND_INSTALL: 'update:quit-and-install',
} as const;
