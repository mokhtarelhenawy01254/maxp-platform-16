import { useRef } from "react";
import type { TraceSpan } from "../types/sandbox.types";

let traceCounter = 0;

function generateTraceId(): string {
  return `tr_${Date.now()}_${++traceCounter}`;
}

function generateSpanId(): string {
  return `sp_${Math.random().toString(36).slice(2, 10)}`;
}

export function useOTelTracing() {
  const activeSpansRef = useRef(new Map<string, TraceSpan>());
  const completedSpansRef = useRef<TraceSpan[]>([]);
  const activeSpans = activeSpansRef.current;
  const completedSpans = completedSpansRef.current;

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
    clear,
  };
}
