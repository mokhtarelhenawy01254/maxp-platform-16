import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type {
  Session,
  ChatMessage,
  AgentConfig,
  ModelConfig,
  CentralKeyConfig,
  ActivityLogEntry,
  EvalScore,
  SafetyCheck,
  ToolCall,
  MessageAttachment,
} from "../types/sandbox.types";
import { sandboxApi, type SessionSummary, type SessionDetail, type SendMessageResponse } from "../services/sandboxApi";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  allowedTools: string[];
}
import { useOTelTracing } from "./useOTelTracing";
import { useCostTracker } from "./useCostTracker";

const ROLE_ICON_MAP: Record<string, string> = {
  CEO: "👔",
  SALES: "💰",
  SUPPORT: "💬",
  INVENTORY: "📦",
  MARKETING: "📢",
  FACEBOOK_SALES_SUPPORT: "🛒",
  SHIPPING: "🚚",
};

function mapAgentFromBackend(raw: Record<string, unknown>): AgentConfig {
  const role = String(raw.role || "").toUpperCase();
  return {
    id: String(raw.id || ""),
    name: String(raw.name || "Unknown Agent"),
    icon: String(raw.icon || ROLE_ICON_MAP[role] || "🤖"),
    role: String(raw.role || "Agent"),
    description: String(raw.description || raw.soul || raw.role || "AI Agent"),
    defaultModel: String(raw.model || "gpt-4o"),
    allowedTools: Array.isArray(raw.allowedTools) ? raw.allowedTools : [],
    allowedSkills: Array.isArray(raw.skills) ? raw.skills : [],
  };
}

function mapModelsFromBackend(raw: {
  providers?: Array<{
    name: string;
    label: string;
    models: Array<{
      id: string;
      label: string;
      keyId?: string;
      keyName?: string;
      keyType?: string;
      scope?: "central";
      keyIsActive?: boolean;
      isPreferred?: boolean;
      isEnabled?: boolean;
      isSelectable?: boolean;
    }>;
  }>;
}): ModelConfig[] {
  const result: ModelConfig[] = [];
  const MODEL_MAX_TOKENS: Record<string, number> = {
    "gpt-4o": 128000, "gpt-4o-mini": 128000, "gpt-4-turbo": 128000,
    "claude-3-5-sonnet": 200000, "claude-3-opus": 200000,
    "gemini-2.5-flash": 1000000, "gemini-2.5-pro": 1000000,
    "gemini-1.5-pro": 1000000, "gemini-1.5-flash": 1000000,
    "deepseek-flash": 1000000, "deepseek-v4-flash": 1000000,
    "llama-3.3-70b": 128000, "llama-3.1-70b": 128000,
    "mistral-large": 128000, "mistral-7b": 32000,
  };
  for (const provider of raw.providers || []) {
    for (const m of provider.models || []) {
      result.push({
        provider: provider.name,
        model: m.id,
        label: m.label || m.id,
        keyId: m.keyId,
        keyName: m.keyName,
        keyType: m.keyType,
        scope: m.scope,
        keyIsActive: m.keyIsActive,
        isPreferred: m.isPreferred,
        isEnabled: m.isEnabled,
        isSelectable: m.isSelectable,
        maxTokens: MODEL_MAX_TOKENS[m.id] || 128000,
        costPer1kInput: m.costPer1kInput ?? 0,
        costPer1kOutput: m.costPer1kOutput ?? 0,
      });
    }
  }
  return result;
}

const QUICK_SCENARIOS = [
  { id: "greeting", label: "Greeting", icon: "👋", prompt: "Hello! Who are you and what can you do?", category: "Basics" },
  { id: "product_search", label: "Search Products", icon: "🔍", prompt: "Search for laptops under 30000 EGP. Show me all available options with their specs and ratings.", category: "Products" },
  { id: "top_selling", label: "Top Selling", icon: "🏆", prompt: "Show me the top selling products this period with revenue numbers.", category: "Products" },
  { id: "low_stock", label: "Low Stock Alert", icon: "⚠️", prompt: "Check which products are low in stock or out of stock. Alert me if any are below 10 units.", category: "Inventory" },
  { id: "adjust_stock", label: "Adjust Stock", icon: "📦", prompt: "Product PROD_001 is running low. I need to increase its stock by 50 units.", category: "Inventory" },
  { id: "create_draft_order", label: "Draft Order", icon: "📝", prompt: "Create a draft order for customer TEST_CUSTOMER_ID. They want 2 MacBook Pro laptops and 1 iPhone 15.", category: "Orders" },
  { id: "order_lookup", label: "Order Lookup", icon: "📋", prompt: "Show me the details of order #ORD_001. I need the status, items, and total.", category: "Orders" },
  { id: "recent_orders", label: "Recent Orders", icon: "🕐", prompt: "Show me the recent orders from today. How many orders and what is the total revenue?", category: "Orders" },
  { id: "cancel_order", label: "Cancel Order", icon: "❌", prompt: "The customer wants to cancel order #ORD_002. Handle this cancellation professionally.", category: "Orders" },
  { id: "handle_refund", label: "Handle Refund", icon: "💬", prompt: "A customer is complaining about order #ORD_003. The product arrived damaged and he wants a full refund. Handle this professionally.", category: "Support" },
  { id: "customer_info", label: "Customer Info", icon: "👤", prompt: "Find customer information for TEST_CUSTOMER_ID. Show me their profile, order history, and loyalty points.", category: "Customers" },
  { id: "top_buyers", label: "Top Buyers", icon: "⭐", prompt: "Who are our top 5 customers? Show me their names and total spending.", category: "Customers" },
  { id: "shipping_rates", label: "Shipping Rates", icon: "🚚", prompt: "What are the available shipping options and rates to Egypt?", category: "Shipping" },
  { id: "apply_discount", label: "Apply Discount", icon: "🏷️", prompt: "Apply a 10% discount to order #ORD_001 for customer loyalty.", category: "Discounts" },
  { id: "sales_report", label: "Sales Report", icon: "📊", prompt: "Generate a sales report for this week. Show me the top 5 products by revenue and compare with last week.", category: "Analytics" },
  { id: "company_snapshot", label: "Company Snapshot", icon: "🏢", prompt: "Show me a quick dashboard snapshot of the company. Revenue, orders, customers, and inventory status.", category: "Analytics" },
  { id: "multi_tool", label: "Complex Task", icon: "🧩", prompt: "I need to: 1) Find customer Mohamed on phone 01001111111, 2) Create a draft order for 2x Product X and 1x Product Y, 3) Apply a 10% loyalty discount. Handle this step by step.", category: "Advanced" },
  { id: "agent_introspection", label: "Agent Capabilities", icon: "🤖", prompt: "List all the tools you have access to. Categorize them into read tools and write tools.", category: "Advanced" },
  { id: "faq_entry", label: "Create FAQ", icon: "📖", prompt: "I want to add a new FAQ entry: customers often ask 'How do I return a product?' The answer should explain the 14-day return policy.", category: "Knowledge" },
  { id: "schedule_job", label: "Schedule Task", icon: "⏰", prompt: "I need to schedule a daily task at 9 AM to check low stock products and alert the team.", category: "Admin" },
];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatStreamError(error?: string, reason?: string): string {
  const code = String(error || "Unknown streaming error").trim();
  const detail = String(reason || "").trim();
  return detail ? `${code}: ${detail}` : code;
}

function normalizePipelineTrace(metadata: any) {
  if (!metadata || typeof metadata !== "object") return undefined;
  return metadata.pipelineTrace && typeof metadata.pipelineTrace === "object"
    ? metadata.pipelineTrace
    : metadata;
}

function normalizeResponseAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      type: String(item.type || "image"),
      url: String(item.url || "").trim(),
      source: item.source ? String(item.source) : undefined,
      tool: item.tool ? String(item.tool) : undefined,
    }))
    .filter((item) => item.url.length > 0);
}

function reconstructActivityLogFromMessages(messages: ChatMessage[]): ActivityLogEntry[] {
  const logs: ActivityLogEntry[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      logs.push({
        id: msg.id + "_log",
        timestamp: msg.timestamp,
        type: "input",
        icon: "🔵",
        title: "User Message",
        details: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : ""),
      });
    } else if (msg.role === "assistant") {
      const trace = msg.metadata;
      if (trace) {
        if (trace.intentClassification) {
          const classification = trace.intentClassification;
          logs.push({
            id: msg.id + "_class",
            timestamp: msg.timestamp,
            type: "plan",
            icon: "🎯" as any,
            title: "Intent Classification",
            details: `${classification.intent} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`,
            metadata: classification as any,
          });
        }
        if (trace.toolPlan) {
          const toolPlan = trace.toolPlan;
          logs.push({
            id: msg.id + "_plan",
            timestamp: msg.timestamp,
            type: "plan",
            icon: "🛣️" as any,
            title: "Tool Plan",
            details: `${toolPlan.primaryTool || 'none'} — ${toolPlan.reason || ''}`,
            metadata: toolPlan as any,
          });
        }
        if (Array.isArray(trace.toolExecutions)) {
          for (let idx = 0; idx < trace.toolExecutions.length; idx++) {
            const t = trace.toolExecutions[idx];
            logs.push({
              id: `${msg.id}_tool_${idx}`,
              timestamp: msg.timestamp,
              type: "tool_call",
              icon: "🔧" as any,
              title: `Tool: ${t.name}`,
              details: t.success ? `Success | params: ${JSON.stringify(t.params)}` : `Failed | error: ${t.resultSummary || ''}`,
              metadata: t as any,
              latencyMs: t.latencyMs,
            });
          }
        }
        if (trace.modelSelection) {
          const ms = trace.modelSelection;
          logs.push({
            id: msg.id + "_ms",
            timestamp: msg.timestamp,
            type: "cost",
            icon: "⚡" as any,
            title: "Model Selection",
            details: `${ms.model} via ${ms.provider} (${ms.keyName || 'central key'})`,
            metadata: ms as any,
          });
        }
      }
      logs.push({
        id: msg.id + "_reply",
        timestamp: msg.timestamp,
        type: "reply",
        icon: "🟢",
        title: "Agent Reply",
        details: `${msg.tokens?.total || 0} tokens | ${msg.latencyMs || 0}ms | ${msg.keyName || msg.keyId || "central key"} | $${(msg.cost || 0).toFixed(4)}`,
        latencyMs: msg.latencyMs,
      });
    }
  }
  return logs;
}

function mapSessionFromDetail(detail: SessionDetail): Session {
  return {
    id: detail.id,
    title: detail.title,
    agentId: detail.agentId,
    model: detail.model,
    provider: detail.provider,
    keyId: detail.keyId,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    messageCount: detail.messageCount,
    toolCallCount: detail.toolCallCount,
    totalCost: detail.totalCost,
    totalTokens: detail.totalTokens,
    avgLatency: detail.avgLatency,
    score: detail.score,
    messages: detail.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      responseAttachments: normalizeResponseAttachments(m.responseAttachments || m.metadata?.responseAttachments),
      timestamp: m.timestamp,
      toolCalls: m.toolCalls,
      model: m.model,
      provider: m.provider,
      keyId: m.keyId,
      keyName: m.keyName,
      tokens: m.tokens,
      latencyMs: m.latencyMs,
      cost: m.cost,
      metadata: normalizePipelineTrace(m.metadata),
      runtime: m.runtime || m.metadata?.runtime,
    })),
  };
}

function mapSessionFromSummary(s: SessionSummary): Session {
  return {
    id: s.id,
    title: s.title,
    agentId: s.agentId,
    model: s.model,
    provider: s.provider,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messageCount,
    toolCallCount: s.toolCallCount,
    totalCost: s.totalCost,
    totalTokens: s.totalTokens,
    avgLatency: s.avgLatency,
    score: s.score,
    messages: [],
  };
}

export function useAgentSandbox() {
  const { t } = useTranslation();
  let searchParams: URLSearchParams;
  let setSearchParams: (updater: (prev: URLSearchParams) => URLSearchParams, options?: { replace?: boolean }) => void;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [searchParams, setSearchParams] = useSearchParams();
  } catch {
    searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    setSearchParams = () => {};
  }

  const urlSessionId = searchParams.get("sessionId") || searchParams.get("session") || null;
  const urlAgentId = searchParams.get("agent") || searchParams.get("agentId") || null;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(urlSessionId);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(urlAgentId || "ceo");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [currentEval, setCurrentEval] = useState<EvalScore | null>(null);
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheck[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [centralKeys, setCentralKeys] = useState<CentralKeyConfig[]>([]);
  const [toolsMetadata, setToolsMetadata] = useState<Array<{ name: string; description: string; sideEffects: "read" | "write" }>>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [typingStage, setTypingStage] = useState<string | null>(null);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const lastSyncedSessionIdRef = useRef<string | null>(urlSessionId);
  const lastSyncedAgentIdRef = useRef<string | null>(urlAgentId);

  const tracing = useOTelTracing();
  const costTracker = useCostTracker();

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await sandboxApi.getSession(sessionId);
      if (res.success && res.session) {
        const session = mapSessionFromDetail(res.session);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? session : s))
        );
        setActiveSessionId((current) => {
          if (current === sessionId) {
            setActivityLog(reconstructActivityLogFromMessages(session.messages));
          }
          return current;
        });
      }
    } catch (err) {
      console.error('[Sandbox] Failed to load session messages:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentsRes, modelsRes, sessionsRes, toolsRes] = await Promise.allSettled([
          sandboxApi.getAgents(),
          sandboxApi.getModels(),
          sandboxApi.listSessions(),
          sandboxApi.getTools(),
        ]);
        if (cancelled) return;
        let preferredAgent: AgentConfig | null = null;
        if (agentsRes.status === "fulfilled" && agentsRes.value.agents?.length) {
          const mappedAgents = agentsRes.value.agents.map(mapAgentFromBackend);
          setAgents(mappedAgents);
          
          // Derive unique skills from all agents
          const allSkills = new Set<string>();
          mappedAgents.forEach(agent => {
            agent.allowedSkills.forEach(skill => allSkills.add(skill));
          });
          // Create basic skill definitions from agent skills
          const derivedSkills: SkillDefinition[] = Array.from(allSkills).map(skillId => ({
            id: skillId,
            name: skillId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: `Skill: ${skillId}`,
            allowedTools: [],
          }));
          setSkills(derivedSkills);
          
          const agentFromUrl = urlAgentId ? mappedAgents.find((a) => a.id === urlAgentId) : null;
          preferredAgent =
            agentFromUrl
            || mappedAgents.find((agent) => agent.role === "FACEBOOK_SALES_SUPPORT")
            || mappedAgents[0]
            || null;
          if (preferredAgent && (selectedAgentId === "ceo" || !mappedAgents.some((agent) => agent.id === selectedAgentId))) {
            setSelectedAgentId(preferredAgent.id);
            lastSyncedAgentIdRef.current = preferredAgent.id;
          }
        }
        if (modelsRes.status === "fulfilled" && modelsRes.value.providers?.length) {
          const mapped = mapModelsFromBackend(modelsRes.value);
          if (mapped.length) {
            setModels(mapped);
            const selectableModels = mapped.filter((m) => m.isSelectable !== false && m.keyIsActive !== false);
            // ponytail: prefer agent's template model over first preferred from DB
            let initialModel = null;
            if (preferredAgent?.defaultModel) {
              initialModel = selectableModels.find((m) => m.model === preferredAgent.defaultModel);
            }
            initialModel = initialModel || selectableModels.find((m) => m.isPreferred) || selectableModels[0];
            if (initialModel) {
              setSelectedModel(initialModel.model);
              setSelectedProvider(initialModel.provider);
              setSelectedKeyId(initialModel.keyId || null);
            } else {
              setSelectedModel("");
              setSelectedProvider("");
              setSelectedKeyId(null);
            }
          }
        }
        setCentralKeys(((modelsRes.status === "fulfilled" && modelsRes.value.centralKeys) || []).map((key) => ({
          id: key.id,
          name: key.name,
          provider: key.provider,
          keyType: "CENTRAL",
          scope: "central",
          isActive: Boolean(key.isActive),
          priority: key.priority,
        })));

        let allSessions: Session[] = [];
        if (sessionsRes.status === "fulfilled" && sessionsRes.value.sessions?.length) {
          allSessions = sessionsRes.value.sessions.map(mapSessionFromSummary);
        }

        let targetSession: Session | null = null;
        if (urlSessionId) {
          targetSession = allSessions.find((s) => s.id === urlSessionId) || null;
          if (!targetSession) {
            try {
              const singleRes = await sandboxApi.getSession(urlSessionId);
              if (singleRes.success && singleRes.session) {
                targetSession = mapSessionFromDetail(singleRes.session);
                allSessions = [targetSession, ...allSessions];
              }
            } catch (err) {
              console.warn('[Sandbox] Could not fetch requested session from URL:', err);
            }
          }
        }

        if (allSessions.length > 0) {
          setSessions(allSessions);
          if (targetSession) {
            setActiveSessionId(targetSession.id);
            lastSyncedSessionIdRef.current = targetSession.id;
            if (targetSession.agentId) {
              setSelectedAgentId(targetSession.agentId);
              lastSyncedAgentIdRef.current = targetSession.agentId;
            }
            loadSessionMessages(targetSession.id);
          } else {
            const matchingSession = preferredAgent
              ? allSessions.find((s) => s.agentId === preferredAgent!.id) || allSessions[0]
              : allSessions[0];
            setActiveSessionId(matchingSession.id);
            lastSyncedSessionIdRef.current = matchingSession.id;
            loadSessionMessages(matchingSession.id);
          }
        }

        if (toolsRes.status === "fulfilled" && toolsRes.value.tools?.length) {
          setToolsMetadata(toolsRes.value.tools);
        }
      } catch (err) {
        console.error('[Sandbox] Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sandbox data');
      } finally {
        setIsSessionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadSessionMessages, urlSessionId, urlAgentId]);

  const handleSelectAgent = useCallback((newAgentId: string) => {
    if (!newAgentId) return;
    setSelectedAgentId(newAgentId);
    lastSyncedAgentIdRef.current = newAgentId;

    setActivityLog([]);
    setCurrentEval(null);
    setSafetyChecks([]);

    const agentSessions = sessions.filter((s) => s.agentId === newAgentId);
    const nextSession = agentSessions.length > 0
      ? [...agentSessions].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0]
      : null;
    const nextSessionId = nextSession?.id || null;

    setActiveSessionId(nextSessionId);
    lastSyncedSessionIdRef.current = nextSessionId;

    if (nextSession) {
      if (nextSession.messages.length === 0) {
        loadSessionMessages(nextSession.id);
      } else {
        setActivityLog(reconstructActivityLogFromMessages(nextSession.messages));
      }
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextSessionId) {
        next.set("sessionId", nextSessionId);
      } else {
        next.delete("sessionId");
      }
      next.delete("session");
      next.set("agent", newAgentId);
      return next;
    }, { replace: true });
  }, [sessions, loadSessionMessages, setSearchParams]);

  // ponytail: auto-select model from agent's template config when agent changes
  useEffect(() => {
    if (!selectedAgentId || agents.length === 0 || models.length === 0) return;
    const agent = agents.find((a) => a.id === selectedAgentId);
    const selectableModels = models.filter((m) => m.isSelectable !== false && m.keyIsActive !== false);
    if (selectableModels.length === 0) return;

    let match = null;
    if (agent?.defaultModel) {
      match = selectableModels.find((m) => m.model === agent.defaultModel);
    }
    match = match || selectableModels.find((m) => m.isPreferred) || selectableModels[0];
    if (match) {
      setSelectedModel(match.model);
      setSelectedProvider(match.provider);
      setSelectedKeyId(match.keyId || null);
    }
  }, [selectedAgentId, agents, models]);

  const selectedAgentSessions = useMemo(
    () => sessions.filter((session) => session.agentId === selectedAgentId),
    [selectedAgentId, sessions]
  );
  const activeSession = sessions.find((s) => (
    s.id === activeSessionId && s.agentId === selectedAgentId
  )) || null;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0] || null;

  const handleSetActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionId(id);
    lastSyncedSessionIdRef.current = id;
    setActivityLog([]);
    setCurrentEval(null);
    setSafetyChecks([]);

    let targetAgentId = selectedAgentId;
    if (id) {
      const existing = sessions.find((s) => s.id === id);
      if (existing) {
        if (existing.agentId && existing.agentId !== selectedAgentId) {
          targetAgentId = existing.agentId;
          setSelectedAgentId(existing.agentId);
          lastSyncedAgentIdRef.current = existing.agentId;
        }
        if (existing.messages.length === 0) {
          loadSessionMessages(id);
        } else {
          setActivityLog(reconstructActivityLogFromMessages(existing.messages));
        }
      }
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set("sessionId", id);
      } else {
        next.delete("sessionId");
      }
      next.delete("session");
      if (targetAgentId) {
        next.set("agent", targetAgentId);
      }
      return next;
    }, { replace: true });
  }, [sessions, selectedAgentId, loadSessionMessages, setSearchParams]);

  // Sync from external URL changes (e.g. browser back/forward navigation)
  useEffect(() => {
    const paramId = searchParams.get("sessionId") || searchParams.get("session") || null;
    const paramAgent = searchParams.get("agent") || searchParams.get("agentId") || null;

    if (paramId === lastSyncedSessionIdRef.current && (!paramAgent || paramAgent === lastSyncedAgentIdRef.current)) {
      return;
    }

    lastSyncedSessionIdRef.current = paramId;
    if (paramAgent) {
      lastSyncedAgentIdRef.current = paramAgent;
    }

    if (paramId) {
      const match = sessions.find((s) => s.id === paramId);
      if (match) {
        setActiveSessionId(match.id);
        if (match.agentId && match.agentId !== selectedAgentId) {
          setSelectedAgentId(match.agentId);
        }
        if (match.messages.length === 0) {
          loadSessionMessages(match.id);
        } else {
          setActivityLog(reconstructActivityLogFromMessages(match.messages));
        }
      } else {
        loadSessionMessages(paramId);
      }
    } else if (paramAgent && paramAgent !== selectedAgentId) {
      setSelectedAgentId(paramAgent);
      const agentSessions = sessions.filter((s) => s.agentId === paramAgent);
      const match = agentSessions.length > 0
        ? [...agentSessions].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0]
        : null;
      setActiveSessionId(match?.id || null);
      if (match) {
        if (match.messages.length === 0) {
          loadSessionMessages(match.id);
        } else {
          setActivityLog(reconstructActivityLogFromMessages(match.messages));
        }
      } else {
        setActivityLog([]);
      }
    }
  }, [searchParams, sessions, selectedAgentId, loadSessionMessages]);

  const getConversationLink = useCallback((sessionId?: string) => {
    const id = sessionId || activeSessionId;
    if (!id) return "";
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://maxp.online";
    return `${origin}/admin/ai-hub?tab=sandbox&sessionId=${encodeURIComponent(id)}`;
  }, [activeSessionId]);

  const copyConversationLink = useCallback(async (sessionId?: string) => {
    const link = getConversationLink(sessionId);
    if (!link) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }
      toast.success("تم نسخ رابط المحادثة بنجاح");
      return true;
    } catch (err) {
      console.error("[Sandbox] Failed to copy conversation link:", err);
      toast.error("فشل نسخ رابط المحادثة");
      return false;
    }
  }, [getConversationLink]);

  const createSession = useCallback(async () => {
    setError(null);
    try {
      const res = await sandboxApi.createSession({
        title: `Test ${sessions.length + 1}`,
        agentId: selectedAgentId,
        model: selectedModel,
        provider: selectedProvider,
        keyId: selectedKeyId || undefined,
      });
      const newSession: Session = {
        id: res.session.id,
        title: res.session.title,
        agentId: selectedAgentId,
        model: selectedModel,
        provider: selectedProvider,
        keyId: selectedKeyId || undefined,
        createdAt: res.session.createdAt,
        updatedAt: res.session.createdAt,
        messageCount: 0,
        toolCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
        messages: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      lastSyncedSessionIdRef.current = newSession.id;
      lastSyncedAgentIdRef.current = selectedAgentId;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sessionId", newSession.id);
        next.delete("session");
        next.set("agent", selectedAgentId);
        return next;
      }, { replace: true });
      setActivityLog([]);
      setCurrentEval(null);
      setSafetyChecks([]);
      tracing.clear();
      costTracker.reset();
      return newSession.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create session failed";
      setError(msg);
      return null;
    }
  }, [selectedAgentId, selectedModel, selectedProvider, selectedKeyId, sessions.length, tracing, costTracker, setSearchParams]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await sandboxApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setActiveSessionId((current) => {
        if (current === sessionId) {
          lastSyncedSessionIdRef.current = null;
          setActivityLog([]);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("sessionId");
            next.delete("session");
            return next;
          }, { replace: true });
          return null;
        }
        return current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete session failed");
    }
  }, [setSearchParams]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      await sandboxApi.updateSessionTitle(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update title failed");
    }
  }, []);

  const addActivityLog = useCallback((entry: ActivityLogEntry) => {
    setActivityLog((prev) => [...prev, entry]);
  }, []);

  const sendMessage = useCallback(
    async (message: string, attachments?: Array<{ type: string; url: string; dataUrl?: string; base64Data?: string }>) => {
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if ((!message.trim() && !hasAttachments) || isLoading) return;
      if (!selectedModel || !selectedProvider || !selectedKeyId) {
        setError("NO_ACTIVE_CENTRAL_KEY");
        addActivityLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          type: "error",
          icon: "🔴",
          title: "Error",
          details: "NO_ACTIVE_CENTRAL_KEY",
        });
        return;
      }

      let sessionId = activeSessionId;
      const activeSessionForSend = sessionId
        ? sessions.find((session) => session.id === sessionId)
        : null;
      if (!activeSessionForSend || activeSessionForSend.agentId !== selectedAgentId) {
        sessionId = null;
      }
      if (!sessionId) {
        const newId = await createSession();
        if (!newId) return;
        sessionId = newId;
      }

      setIsLoading(true);
      setIsStreaming(true);
      setError(null);
      setTypingStage(null);
      setActiveToolCalls([]);

      let finalContent = message.trim();
      if (hasAttachments) {
        const md = attachments!.map(att => `![image](${att.url})`).join("\n\n");
        finalContent = [md, message.trim()].filter(Boolean).join("\n\n");
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: finalContent,
        timestamp: new Date().toISOString(),
      };

      const inputSpanId = tracing.traceUserInput(finalContent);
      tracing.endSpan(inputSpanId);

      addActivityLog({
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: "input",
        icon: "🔵",
        title: "User Message",
        details: finalContent.slice(0, 100) + (finalContent.length > 100 ? "..." : ""),
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date().toISOString() }
            : s
        )
      );

      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, assistantMsg] }
            : s
        )
      );

      let streamingReply = "";
      let streamingTools: ToolCall[] = [];
      let streamingResponseAttachments: MessageAttachment[] = [];
      let runError: string | null = null;
      let finalTokens = { input: 0, output: 0, total: 0 };
      let finalLatencyMs = 0;
      let finalModel = selectedModel;
      let finalProvider = selectedProvider;
      let finalKeyId = selectedKeyId;
      let finalKeyName: string | undefined;
      let finalCost = 0;
      let updateSessionId = sessionId;
      let finalUsedFallbackKey = false;
      let finalRuntime: string | undefined;
      let pipelineTrace: any = null;

      try {
        await sandboxApi.streamMessage(
          sessionId,
          message.trim(),
          selectedAgentId,
          selectedModel,
          selectedProvider,
          selectedKeyId,
          attachments,
          (event) => {
            switch (event.type) {
              case "agent_start":
                addActivityLog({
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  type: "plan",
                  icon: "🟡" as any,
                  title: "Agent Start",
                  details: event.message || "Starting agent run...",
                });
                break;

              case "agent_thinking":
                setTypingStage(event.message || event.stage || "Thinking...");
                addActivityLog({
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  type: "plan",
                  icon: "🟡" as any,
                  title: event.stage || "Thinking",
                  details: event.message || "...",
                });
                break;

              case "tool_calling":
                if (event.tools && event.tools.length > 0) {
                  const newToolCalls: ToolCall[] = event.tools.map((toolName) => ({
                    id: generateId(),
                    name: toolName,
                    input: {},
                    status: "pending",
                    timestamp: new Date().toISOString(),
                  }));
                  streamingTools = [...streamingTools, ...newToolCalls];
                  setActiveToolCalls(streamingTools);
                  addActivityLog({
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    type: "tool_call",
                    icon: "🔧" as any,
                    title: "Tool Calling",
                    details: event.tools.join(", "),
                  });
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== sessionId) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, toolCalls: streamingTools }
                            : m
                        ),
                      };
                    })
                  );
                }
                break;

              case "tool_executing":
                if (event.tool) {
                  streamingTools = streamingTools.map((tc) =>
                    tc.name === event.tool ? { ...tc, status: "pending" as const } : tc
                  );
                  setActiveToolCalls(streamingTools);
                  addActivityLog({
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    type: "tool_call",
                    icon: "⚙️" as any,
                    title: `Executing: ${event.tool}`,
                    details: "Running...",
                  });
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== sessionId) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, toolCalls: streamingTools }
                            : m
                        ),
                      };
                    })
                  );
                }
                break;

              case "tool_result":
                if (event.tool) {
                  streamingTools = streamingTools.map((tc) =>
                    tc.name === event.tool
                      ? { ...tc, status: "success" as const, output: event.result as Record<string, unknown> }
                      : tc
                  );
                  setActiveToolCalls(streamingTools);
                  setTypingStage(null);
                  addActivityLog({
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    type: "tool_result",
                    icon: "✅" as any,
                    title: `Tool Result: ${event.tool}`,
                    details: event.result ? JSON.stringify(event.result).slice(0, 200) : "Completed",
                  });
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== sessionId) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, toolCalls: streamingTools }
                            : m
                        ),
                      };
                    })
                  );
                }
                break;

              case "agent_reply":
                if (event.reply !== undefined) {
                  const isIncremental = event.isIncremental !== false;
                  if (isIncremental) {
                    streamingReply = (streamingReply || "") + event.reply;
                  } else {
                    streamingReply = event.reply;
                  }
                  if (event.responseAttachments) {
                    streamingResponseAttachments = normalizeResponseAttachments(event.responseAttachments);
                  }
                  if (event.usedFallbackKey) finalUsedFallbackKey = true;
                  setTypingStage(null);
                  addActivityLog({
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    type: "reply",
                    icon: "🟢",
                    title: "Agent Reply (streaming)",
                    details: streamingReply.slice(0, 100) + (streamingReply.length > 100 ? "..." : ""),
                  });
                  setSessions((prev) =>
                    prev.map((s) => {
                      if (s.id !== sessionId) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: streamingReply, responseAttachments: streamingResponseAttachments }
                            : m
                        ),
                      };
                    })
                  );
                }
                break;

              case "run_complete":
                if (event.toolCalls) {
                  streamingTools = event.toolCalls.map((tc: any) => ({
                    id: tc.id || generateId(),
                    name: tc.name,
                    input: tc.input || {},
                    output: tc.output,
                    status: (tc.status as "pending" | "success" | "error") || "success",
                    latencyMs: tc.latencyMs,
                    timestamp: tc.timestamp || new Date().toISOString(),
                    error: tc.error,
                  }));
                }
                if (event.responseAttachments) {
                  streamingResponseAttachments = normalizeResponseAttachments(event.responseAttachments);
                }
                break;

              case "run_error":
                runError = formatStreamError(event.error, event.reason);
                addActivityLog({
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                  type: "error",
                  icon: "🔴",
                  title: "Run Error",
                  details: runError,
                });
                break;
            }
            // Handle the final `done` event that carries session metadata
            if (event.done === true) {
              if (event.tokens) finalTokens = event.tokens;
              if (event.latencyMs !== undefined) finalLatencyMs = event.latencyMs;
              if (event.model) finalModel = event.model;
              if (event.provider) finalProvider = event.provider;
              if (event.keyId) finalKeyId = event.keyId;
              if (event.keyName) finalKeyName = event.keyName;
              if (event.cost !== undefined) finalCost = event.cost;
              if (event.sessionId) updateSessionId = event.sessionId;
              if (event.error) runError = formatStreamError(event.error, event.reason);
              if (event.usedFallbackKey) finalUsedFallbackKey = true;
              if (event.runtime) finalRuntime = event.runtime;
              if (event.responseAttachments) {
                streamingResponseAttachments = normalizeResponseAttachments(event.responseAttachments);
              }
              if (event.pipelineTrace) {
                if (event.compiledSystemPrompt) {
                  event.pipelineTrace._compiledSystemPrompt = event.compiledSystemPrompt;
                }
                pipelineTrace = event.pipelineTrace;
              }
            }
          }
        );

        if (runError) {
          throw new Error(runError);
        }

        costTracker.addTokens(finalTokens, finalModel, 0);

        addActivityLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          type: "reply",
          icon: "🟢",
          title: "Agent Reply",
          details: `${finalTokens?.total || 0} tokens | ${finalLatencyMs || 0}ms | ${finalKeyName || finalKeyId || "central key"} | $${(finalCost || 0).toFixed(4)}`,
          latencyMs: finalLatencyMs,
        });

        if (pipelineTrace) {
          const traceLogEntries = reconstructActivityLogFromMessages([{
            id: assistantId,
            role: "assistant",
            content: streamingReply,
            timestamp: new Date().toISOString(),
            metadata: pipelineTrace,
          }]).filter((entry) => entry.type !== "reply");
          for (const entry of traceLogEntries) {
            addActivityLog(entry);
          }
          if (pipelineTrace.activeSkill) {
            addActivityLog({
              id: generateId(),
              timestamp: new Date().toISOString(),
              type: "plan",
              icon: "🟣" as any,
              title: "Skill Activated",
              details: `${pipelineTrace.activeSkill.skillId}${pipelineTrace.activeSkill.requiresHumanApproval ? " (requires approval)" : ""}`,
              metadata: pipelineTrace.activeSkill as any,
            });
          }
        }

        if (finalUsedFallbackKey) {
          addActivityLog({
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: "warning",
            icon: "⚠️",
            title: "Key Fallback",
            details: `Preferred key doesn't support this model. Using fallback key: ${finalKeyName || finalKeyId}`,
          });
        }

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== updateSessionId) return s;
            const messages = s.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: streamingReply,
                    responseAttachments: streamingResponseAttachments,
                    model: finalModel,
                    provider: finalProvider,
                    keyId: finalKeyId,
                    keyName: finalKeyName,
                    toolCalls: streamingTools,
                    tokens: finalTokens,
                    latencyMs: finalLatencyMs,
                    cost: finalCost,
                    metadata: pipelineTrace,
                    usedFallbackKey: finalUsedFallbackKey,
                    runtime: finalRuntime,
                  }
                : m
            );
            return {
              ...s,
              messages,
              messageCount: messages.length,
              totalCost: s.totalCost + (finalCost || 0),
              totalTokens: s.totalTokens + (finalTokens?.total || 0),
              toolCallCount: s.toolCallCount + (streamingTools?.length || 0),
              updatedAt: new Date().toISOString(),
            };
          })
        );

        setActiveSessionId(updateSessionId);

        const llmSpanId = tracing.traceLLMCall(finalModel, finalProvider, finalContent);
        tracing.endSpan(llmSpanId, {
          tokens: finalTokens?.total || 0,
          cost: finalCost || 0,
          latencyMs: finalLatencyMs || 0,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== assistantId) }
              : s
          )
        );

        addActivityLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          type: "error",
          icon: "🔴",
          title: "Error",
          details: errorMsg,
        });
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        setTypingStage(null);
        setActiveToolCalls([]);
      }
    },
    [
      activeSessionId,
      sessions,
      selectedAgentId,
      selectedModel,
      selectedProvider,
      selectedKeyId,
      isLoading,
      createSession,
      tracing,
      costTracker,
      addActivityLog,
    ]
  );

  const evaluateLastResponse = useCallback(async () => {
    if (!activeSession || activeSession.messages.length < 2) return;

    const lastUserMsg = [...activeSession.messages].reverse().find((m) => m.role === "user");
    const lastAssistantMsg = [...activeSession.messages].reverse().find((m) => m.role === "assistant");

    if (!lastUserMsg || !lastAssistantMsg) return;

    try {
      const result = await sandboxApi.evaluateResponse(
        lastUserMsg.content,
        lastAssistantMsg.content,
        lastAssistantMsg.toolCalls || [],
        undefined,
        selectedProvider,
        selectedModel,
        selectedKeyId || undefined
      );

      const evalScore: EvalScore = {
        accuracy: result.scores.accuracy,
        helpfulness: result.scores.helpfulness,
        relevance: result.scores.relevance,
        completeness: result.scores.completeness,
        safety: result.scores.safety,
        overall: result.scores.overall,
        comment: result.comment,
        timestamp: new Date().toISOString(),
      };

      setCurrentEval(evalScore);

      const checks: SafetyCheck[] = [
        { id: generateId(), name: "No PII Leakage", status: result.scores.safety > 80 ? "pass" : "warn", message: "No personal information exposed", timestamp: new Date().toISOString() },
        { id: generateId(), name: "No Harmful Content", status: result.scores.safety > 90 ? "pass" : "fail", message: "Output is safe", timestamp: new Date().toISOString() },
        { id: generateId(), name: "Tool Call Validation", status: (lastAssistantMsg.toolCalls?.length || 0) > 0 ? "pass" : "warn", message: "Tools were used appropriately", timestamp: new Date().toISOString() },
        { id: generateId(), name: "Response Format", status: result.scores.completeness > 70 ? "pass" : "warn", message: "Response is well-structured", timestamp: new Date().toISOString() },
      ];
      setSafetyChecks(checks);

      addActivityLog({
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: "eval",
        icon: "📊",
        title: "Evaluation Complete",
        details: `Overall: ${result.scores.overall}/100 | ${result.comment}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    }
  }, [activeSession, addActivityLog]);

  const runQuickScenario = useCallback(
    (scenarioId: string) => {
      const scenario = QUICK_SCENARIOS.find((s) => s.id === scenarioId);
      if (scenario) {
        sendMessage(scenario.prompt);
      }
    },
    [sendMessage]
  );

  const exportSession = useCallback(
    async (format: "json" | "markdown") => {
      if (!activeSessionId) return;
      try {
        const content = await sandboxApi.exportSession(activeSessionId, format);
        const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sandbox-session-${activeSessionId}.${format === "json" ? "json" : "md"}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    },
    [activeSessionId]
  );

  const localizedScenarios = useMemo(() => {
    const raw = t("sandbox.scenarios", { returnObjects: true });
    if (Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
    return QUICK_SCENARIOS;
  }, [t]);

  return {
    sessions: selectedAgentSessions,
    activeSession,
    activeSessionId,
    selectedAgentId,
    selectedModel,
    selectedProvider,
    selectedKeyId,
    isLoading,
    isStreaming,
    isSessionsLoading,
    error,
    activityLog,
    currentEval,
    safetyChecks,
    agents,
    models,
    centralKeys,
    quickScenarios: localizedScenarios,
    toolsMetadata,
    skills,
    costBreakdown: costTracker.breakdown,
    selectedAgent,
    typingStage,
    activeToolCalls,
    setSelectedAgentId: handleSelectAgent,
    setSelectedModel,
    setSelectedProvider,
    setSelectedKeyId,
    setActiveSessionId: handleSetActiveSessionId,
    createSession,
    deleteSession,
    updateSessionTitle,
    sendMessage,
    evaluateLastResponse,
    runQuickScenario,
    exportSession,
    getConversationLink,
    copyConversationLink,
    formatCost: costTracker.formatCost,
    formatTokens: costTracker.formatTokens,
    clearActivityLog: () => setActivityLog([]),
    clearError: () => setError(null),
  };
}
