import apiClient, { ApiRequestConfig } from "./api";

export type AgentInboxScope =
  | "facebook-inbox:read"
  | "facebook-inbox:evaluate"
  | "facebook-inbox:draft";

export type AgentInboxCompany = {
  id: string;
  name: string;
  slug: string | null;
  email?: string | null;
  isActive?: boolean;
};

export type AgentInboxPage = {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  connectedAt: string;
  disconnectedAt?: string | null;
  updatedAt?: string;
};

export type AgentInboxCredential = {
  id: string;
  name: string;
  description: string | null;
  scopes: AgentInboxScope[];
  isActive: boolean;
  keyPrefixMasked: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentInboxContext = {
  company: AgentInboxCompany;
  pages: AgentInboxPage[];
  credentials: AgentInboxCredential[];
  scopes: AgentInboxScope[];
  recommendedScopes: AgentInboxScope[];
  externalEndpoints: {
    conversations: string;
    pullRecent: string;
    pullConversation: string;
    evaluateConversation: string;
  };
};

export type AgentInboxSecret = {
  apiKey?: string;
};

export type AgentInboxContextResponse = {
  success: boolean;
  data: AgentInboxContext;
  message?: string;
};

export type AgentInboxCredentialResponse = {
  success: boolean;
  data: AgentInboxCredential;
  secret?: AgentInboxSecret;
  message?: string;
};

export type AgentInboxConversationEvaluation = {
  status: string;
  severity: string;
  score: number;
  detectedIntent: string;
  issueCodes: string[];
  summary: string;
  recommendations: string[];
  responseTimeMinutes: number | null;
  minutesSinceCustomer: number | null;
};

export type AgentInboxConversation = {
  id: string;
  status: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    facebookIdMasked: string | null;
  } | null;
  page?: {
    pageId: string;
    pageName: string | null;
  } | null;
  evaluation?: AgentInboxConversationEvaluation;
};

export type AgentInboxConversationListResponse = {
  success: boolean;
  data: {
    company: AgentInboxCompany;
    pages: AgentInboxPage[];
    conversations: AgentInboxConversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
};

export const agentInboxService = {
  async getContext(params?: { q?: string; companyId?: string }) {
    const response = await apiClient.get<AgentInboxContextResponse>(
      "/agent-inbox/admin/context",
      { params, _skipErrorToast: true },
    );
    return response.data;
  },

  async createCredential(payload: {
    companyId?: string;
    name: string;
    description?: string;
    scopes: AgentInboxScope[];
    expiresAt?: string;
  }) {
    const response = await apiClient.post<AgentInboxCredentialResponse>(
      "/agent-inbox/admin/credentials",
      payload,
      { _skipErrorToast: true },
    );
    return response.data;
  },

  async rotateCredential(credentialId: string, companyId?: string) {
    const response = await apiClient.post<AgentInboxCredentialResponse>(
      `/agent-inbox/admin/credentials/${credentialId}/rotate`,
      { companyId },
      { _skipErrorToast: true },
    );
    return response.data;
  },

  async revokeCredential(credentialId: string, companyId?: string) {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      `/agent-inbox/admin/credentials/${credentialId}`,
      {
        data: { companyId },
        _skipErrorToast: true,
      } as ApiRequestConfig,
    );
    return response.data;
  },

  async testConversations(apiKey: string) {
    const response = await apiClient.get<AgentInboxConversationListResponse>(
      "/agent-inbox/facebook/conversations",
      {
        params: { limit: 5, includeEvaluation: "1", unrepliedOnly: "0" },
        headers: { "X-API-Key": apiKey },
        _skipAuthHeader: true,
        _skipErrorToast: true,
      },
    );
    return response.data;
  },
};

export default agentInboxService;
