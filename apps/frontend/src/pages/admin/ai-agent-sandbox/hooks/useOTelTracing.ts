import type { TraceSpan, ActivityLogEntry, ToolCall } from "../types/sandbox.types";

let traceCounter = 0;

function generateTraceId(): string {
  return `tr_${Date.now()}_${++traceCounter}`;
}

function generateSpanId(): string {
  return `sp_${Math.random().toString(36).slice(2, 10)}`;
}

export interface TraceSession {
  traceId: string;
  spans: TraceSpan[];
  startTime: string;
  totalDurationMs: number;
  totalTokens: number;
  totalCost: number;
  toolCallCount: number;
}

export function useOTelTracing() {
  const activeSpans = new Map<string, TraceSpan>();
  const completedSpans: TraceSpan[] = [];

  function startSpan(
    name: string,
    type: TraceSpan["type"],
    attributes: Record<string, unknown> = {}
  ): string {
    const spanId = generateSpanId();
    const span: TraceSpan = {
      traceId: generateTraceId(),
      spanId,
      name,
      type,
      startTime: new Date().toISOString(),
      attributes,
      status: "ok",
    };
    activeSpans.set(spanId, span);
    return spanId;
  }

  function endSpan(spanId: string, attributes?: Record<string, unknown>, error?: string): TraceSpan | null {
    const span = activeSpans.get(spanId);
    if (!span) return null;

    span.endTime = new Date().toISOString();
    span.durationMs = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();
    if (attributes) span.attributes = { ...span.attributes, ...attributes };
    if (error) {
      span.status = "error";
      span.attributes.error = error;
    }

    activeSpans.delete(spanId);
    completedSpans.push(span);
    return span;
  }

  function traceLLMCall(
    model: string,
    provider: string,
    prompt: string
  ): string {
    return startSpan(`${provider}/${model}`, "llm_call", {
      model,
      provider,
      promptLength: prompt.length,
    });
  }

  function traceToolCall(toolName: string, input: Record<string, unknown>): string {
    return startSpan(`tool:${toolName}`, "tool_call", {
      toolName,
      input: JSON.stringify(input),
    });
  }

  function traceDecision(name: string, reason: string): string {
    return startSpan(`decision:${name}`, "decision", { reason });
  }

  function traceUserInput(message: string): string {
    return startSpan("user_input", "user_input", {
      messageLength: message.length,
      messagePreview: message.slice(0, 100),
    });
  }

  function traceAgentReply(reply: string, tokens: number): string {
    return startSpan("agent_reply", "agent_reply", {
      replyLength: reply.length,
      tokens,
    });
  }

  function getTraceSession(): TraceSession {
    const allSpans = [...completedSpans, ...activeSpans.values()];
    const llmSpans = allSpans.filter((s) => s.type === "llm_call");
    const toolSpans = allSpans.filter((s) => s.type === "tool_call");

    const totalTokens = llmSpans.reduce(
      (sum, s) => sum + ((s.attributes.tokens as number) || 0),
      0
    );

    const totalCost = llmSpans.reduce(
      (sum, s) => sum + ((s.attributes.cost as number) || 0),
      0
    );

    const totalDurationMs = allSpans.reduce(
      (sum, s) => sum + (s.durationMs || 0),
      0
    );

    return {
      traceId: allSpans[0]?.traceId || generateTraceId(),
      spans: allSpans,
      startTime: allSpans[0]?.startTime || new Date().toISOString(),
      totalDurationMs,
      totalTokens,
      totalCost,
      toolCallCount: toolSpans.length,
    };
  }

  function toActivityLog(toolCalls?: ToolCall[]): ActivityLogEntry[] {
    const entries: ActivityLogEntry[] = [];

    for (const span of completedSpans) {
      const time = new Date(span.startTime).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      switch (span.type) {
        case "user_input":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: "input",
            icon: "🔵",
            title: "User Message",
            details: String(span.attributes.messagePreview || ""),
            latencyMs: span.durationMs,
          });
          break;

        case "llm_call":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: span.name.includes("plan") ? "plan" : "reply",
            icon: span.status === "error" ? "🔴" : "🟢",
            title: span.status === "error" ? "LLM Error" : "Agent Reply",
            details: `${span.attributes.model} | ${span.durationMs || 0}ms | ${span.attributes.tokens || 0} tokens`,
            metadata: span.attributes,
            latencyMs: span.durationMs,
          });
          break;

        case "tool_call":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: "tool_call",
            icon: "⚙️",
            title: `Tool: ${span.attributes.toolName}`,
            details: span.status === "error" ? `Error: ${span.attributes.error}` : "Called",
            metadata: span.attributes,
            latencyMs: span.durationMs,
          });
          break;

        case "tool_call_result":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: "tool_result",
            icon: span.status === "error" ? "🔴" : "✅",
            title: `Result: ${span.attributes.toolName}`,
            details: span.status === "error" ? String(span.attributes.error) : "Success",
            metadata: span.attributes,
            latencyMs: span.durationMs,
          });
          break;

        case "decision":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: "plan",
            icon: "🟡",
            title: `Decision: ${span.name}`,
            details: String(span.attributes.reason || ""),
            metadata: span.attributes,
            latencyMs: span.durationMs,
          });
          break;

        case "agent_reply":
          entries.push({
            id: span.spanId,
            timestamp: span.startTime,
            type: "reply",
            icon: "🟢",
            title: "Agent Reply Sent",
            details: `${span.attributes.replyLength} chars | ${span.attributes.tokens} tokens`,
            metadata: span.attributes,
            latencyMs: span.durationMs,
          });
          break;
      }
    }

    return entries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  function clear() {
    activeSpans.clear();
    completedSpans.length = 0;
  }

  return {
    startSpan,
    endSpan,
    traceLLMCall,
    traceToolCall,
    traceDecision,
    traceUserInput,
    traceAgentReply,
    getTraceSession,
    toActivityLog,
    clear,
  };
}
