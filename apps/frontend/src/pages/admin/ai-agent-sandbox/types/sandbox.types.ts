export type AgentStatus = "ACTIVE" | "IDLE" | "THINKING" | "ERROR";

export type ToolSideEffect = "read" | "write";

export type EvalVerdict = "improved" | "regressed" | "neither_pass" | "match" | "mismatch";

export interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  role: string;
  description: string;
  defaultModel: string;
  allowedTools: string[];
}

export interface ModelConfig {
  provider: string;
  model: string;
  label: string;
  keyId?: string;
  keyName?: string;
  keyType?: string;
  scope?: "central";
  keyIsActive?: boolean;
  isPreferred?: boolean;
  isEnabled?: boolean;
  isSelectable?: boolean;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface CentralKeyConfig {
  id: string;
  name: string;
  provider: string;
  keyType: "CENTRAL";
  scope: "central";
  isActive: boolean;
  priority?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  sideEffect: ToolSideEffect;
  enabled: boolean;
  inputSchema?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "success" | "error";
  latencyMs?: number;
  timestamp: string;
  error?: string;
}

export interface PipelineTrace {
  intentClassification?: {
    intent: string;
    confidence: number;
    confidenceLevel: string;
    ambiguous: boolean;
    clarificationQuestion?: string | null;
    slots?: Record<string, any>;
    missingSlots?: string[];
  } | null;
  toolPlan?: {
    intent: string;
    primaryTool?: string | null;
    allowedTools?: string[];
    reason?: string;
    selectionScore?: number | null;
    ambiguous?: boolean;
  } | null;
  toolExecutions?: Array<{
    name: string;
    params?: Record<string, any>;
    resultSummary?: string | null;
    success?: boolean;
    latencyMs?: number;
  }>;
  modelSelection?: {
    provider: string | null;
    model: string | null;
    keyId?: string | null;
    keyName?: string | null;
  } | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  model?: string;
  provider?: string;
  keyId?: string;
  keyName?: string;
  tokens?: TokenUsage;
  latencyMs?: number;
  cost?: number;
  metadata?: PipelineTrace;
  usedFallbackKey?: boolean;
  runtime?: string;
}

export interface SandboxTraceSummary {
  runtime?: string;
  model?: string;
  provider?: string;
  keyName?: string;
  keyId?: string;
  toolCalls?: ToolCall[];
  pipelineTrace?: PipelineTrace | null;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface Session {
  id: string;
  title: string;
  agentId: string;
  model: string;
  provider: string;
  keyId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  toolCallCount: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  score?: number;
  messages: ChatMessage[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  type: "input" | "plan" | "tool_call" | "tool_result" | "reply" | "error" | "eval" | "cost" | "warning";
  icon: "🔵" | "🟡" | "⚙️" | "✅" | "🟢" | "🔴" | "📊" | "💰" | "⚠️";
  title: string;
  details: string;
  metadata?: Record<string, unknown>;
  latencyMs?: number;
}

export type StreamEventType =
  | "agent_start"
  | "agent_thinking"
  | "tool_calling"
  | "tool_executing"
  | "tool_result"
  | "agent_reply"
  | "run_complete"
  | "run_error";

export interface StreamEvent {
  type: StreamEventType;
  runId?: string;
  timestamp?: number;
  message?: string;
  stage?: string;
  tools?: string[];
  tool?: string;
  result?: unknown;
  reply?: string;
  /** When true, `reply` is a delta to append to the current message; when false/undefined, `reply` is the full message. */
  isIncremental?: boolean;
  modelUsed?: string;
  tokens?: TokenUsage;
  latencyMs?: number;
  cost?: number;
  error?: string;
  reason?: string;
  done?: boolean;
  sessionId?: string;
  model?: string;
  provider?: string;
  keyId?: string;
  keyName?: string;
  toolCalls?: ToolCall[];
  runtime?: string;
  pipelineTrace?: PipelineTrace;
}

export interface EvalScore {
  accuracy: number;
  helpfulness: number;
  relevance: number;
  completeness: number;
  safety: number;
  overall: number;
  comment?: string;
  timestamp: string;
}

export interface SafetyCheck {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  timestamp: string;
}

export interface QuickScenario {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: string;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  type: "llm_call" | "tool_call" | "decision" | "user_input" | "agent_reply";
  startTime: string;
  endTime?: string;
  durationMs?: number;
  attributes: Record<string, unknown>;
  status: "ok" | "error";
}

export interface SandboxState {
  sessions: Session[];
  activeSessionId: string | null;
  selectedAgentId: string;
  selectedModel: string;
  selectedProvider: string;
  selectedKeyId: string | null;
  centralKeys: CentralKeyConfig[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  activityLog: ActivityLogEntry[];
  currentEval: EvalScore | null;
  safetyChecks: SafetyCheck[];
  totalCost: number;
  totalTokens: number;
  typingStage?: string | null;
  activeToolCalls?: ToolCall[];
}
