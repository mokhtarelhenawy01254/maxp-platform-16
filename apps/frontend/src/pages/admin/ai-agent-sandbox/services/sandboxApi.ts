import { buildApiUrl } from "../../../../utils/urlHelper";
import { tokenManager } from "../../../../utils/tokenManager";
import type { ChatMessage, MessageAttachment, ToolCall, StreamEvent } from "../types/sandbox.types";

const getAuthHeaders = () => tokenManager.createAuthHeaders();

export interface SessionSummary {
  id: string;
  title: string;
  agentId: string;
  agentName?: string;
  agentRole?: string;
  model: string;
  provider: string;
  messageCount: number;
  toolCallCount: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends SessionSummary {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    model?: string;
    provider?: string;
    keyId?: string;
    keyName?: string;
    tokens: { input: number; output: number; total: number };
    latencyMs?: number;
    cost: number;
    toolCalls: ToolCall[];
    timestamp: string;
    metadata?: any;
    responseAttachments?: MessageAttachment[];
    runtime?: string;
  }>;
}

export interface StreamChunk {
  text?: string;
  toolCall?: ToolCall;
  done?: boolean;
  error?: string;
  code?: string;
  tokens?: { input: number; output: number; total: number };
  latencyMs?: number;
  model?: string;
  provider?: string;
  keyId?: string;
  keyName?: string;
  cost?: number;
  sessionId?: string;
  pipelineTrace?: any;
  runtime?: string;
}

export interface SendMessageResponse {
  success: boolean;
  reply: string;
  responseAttachments?: MessageAttachment[];
  toolCalls: ToolCall[];
  tokens: { input: number; output: number; total: number };
  latencyMs: number;
  model: string;
  provider: string;
  keyId?: string;
  keyName?: string;
  keyScope?: "central";
  cost: number;
  sessionId: string;
  pipelineTrace?: any;
  runtime?: string;
}

export interface AgentListResponse {
  success: boolean;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    tools: string[];
    skills: string[];
  }>;
}

export interface ModelsResponse {
  success: boolean;
  providers: Array<{
    name: string;
    label: string;
    models: Array<{
      id: string;
      label: string;
      keyId: string;
      keyName: string;
      keyType: "CENTRAL";
      scope: "central";
      keyIsActive?: boolean;
      isPreferred?: boolean;
      isEnabled?: boolean;
      isSelectable?: boolean;
      costPer1kInput?: number;
      costPer1kOutput?: number;
    }>;
  }>;
  centralKeys?: Array<{
    id: string;
    name: string;
    provider: string;
    keyType: "CENTRAL";
    scope: "central";
    isActive: boolean;
    priority?: number;
  }>;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(url), {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const sandboxApi = {
  async listSessions(): Promise<{ success: boolean; sessions: SessionSummary[]; count: number }> {
    return request("ai-sandbox/sessions");
  },

  async getSession(sessionId: string): Promise<{ success: boolean; session: SessionDetail }> {
    return request(`ai-sandbox/sessions/${sessionId}`);
  },

  async createSession(data: {
    title?: string; agentId: string; agentName?: string; agentRole?: string;
    model: string; provider: string; keyId?: string;
  }): Promise<{ success: boolean; session: { id: string; title: string; createdAt: string } }> {
    return request("ai-sandbox/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSessionTitle(sessionId: string, title: string): Promise<{ success: boolean }> {
    return request(`ai-sandbox/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    return request(`ai-sandbox/sessions/${sessionId}`, { method: "DELETE" });
  },

  async sendMessage(
    sessionId: string,
    message: string,
    agentId: string,
    model: string,
    provider: string,
    keyId?: string | null,
    attachments?: Array<{ type: string; url: string }>
  ): Promise<SendMessageResponse> {
    const response = await fetch(buildApiUrl("ai-sandbox/chat"), {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, message, agentId, model, provider, keyId, attachments }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return response.json();
  },

  async streamMessage(
    sessionId: string,
    message: string,
    agentId: string,
    model: string,
    provider: string,
    keyId: string | null,
    attachments?: Array<{ type: string; url: string }>,
    onEvent?: (event: StreamEvent) => void
  ): Promise<void> {
    const response = await fetch(buildApiUrl("ai-sandbox/chat/stream"), {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, message, agentId, model, provider, keyId, attachments }),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by double newlines
      const eventBlocks = buffer.split("\n\n");
      buffer = eventBlocks.pop() || "";

      for (const block of eventBlocks) {
        const lines = block.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: StreamEvent = JSON.parse(line.slice(6));
              onEvent?.(data);
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
    }
  },

  async getAgents(): Promise<AgentListResponse> {
    const response = await fetch(buildApiUrl("ai-sandbox/agents"), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status}`);
    }

    return response.json();
  },

  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(buildApiUrl("ai-sandbox/models"), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    return response.json();
  },

  async evaluateResponse(
    message: string,
    response: string,
    toolCalls: ToolCall[],
    criteria?: string[],
    provider?: string,
    model?: string,
    keyId?: string
  ): Promise<{
    success: boolean;
    scores: {
      accuracy: number;
      helpfulness: number;
      relevance: number;
      completeness: number;
      safety: number;
      overall: number;
    };
    comment: string;
  }> {
    const res = await fetch(buildApiUrl("ai-sandbox/evaluate"), {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, response, toolCalls, criteria, provider, model, keyId }),
    });

    if (!res.ok) {
      throw new Error(`Evaluation failed: ${res.status}`);
    }

    return res.json();
  },

  async exportSession(sessionId: string, format: "json" | "markdown"): Promise<string> {
    const response = await fetch(buildApiUrl(`ai-sandbox/sessions/${sessionId}/export?format=${format}`), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  },

  async getTools(): Promise<{ success: boolean; tools: Array<{ name: string; description: string; sideEffect: "read" | "write" }> }> {
    const response = await fetch(buildApiUrl("ai-sandbox/tools"), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sandbox tools: ${response.status}`);
    }

    return response.json();
  },
};
