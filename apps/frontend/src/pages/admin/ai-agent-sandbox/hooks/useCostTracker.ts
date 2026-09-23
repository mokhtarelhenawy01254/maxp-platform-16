import { useState, useCallback, useRef } from "react";
import type { TokenUsage } from "../types/sandbox.types";

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  estimatedMonthly: number;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.01 },
  "deepseek-flash": { input: 0.00015, output: 0.0006 },
  "deepseek-v4-flash": { input: 0.00014, output: 0.00028 },
  "llama-3.3-70b": { input: 0.00059, output: 0.00079 },
  "mistral-large": { input: 0.002, output: 0.006 },
};

export function useCostTracker() {
  const [breakdown, setBreakdown] = useState<CostBreakdown>({
    inputTokens: 0,
    outputTokens: 0,
    toolCallCount: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    estimatedMonthly: 0,
  });

  const sessionHistory = useRef<Array<{ cost: number; timestamp: string }>>([]);

  const addTokens = useCallback((tokens: TokenUsage, model: string, toolCalls: number = 0) => {
    const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o"];
    const inputCost = (tokens.input / 1000) * costs.input;
    const outputCost = (tokens.output / 1000) * costs.output;
    const totalCost = inputCost + outputCost;

    setBreakdown((prev) => {
      const newInputTokens = prev.inputTokens + tokens.input;
      const newOutputTokens = prev.outputTokens + tokens.output;
      const newToolCalls = prev.toolCallCount + toolCalls;
      const newInputCost = prev.inputCost + inputCost;
      const newOutputCost = prev.outputCost + outputCost;
      const newTotalCost = prev.totalCost + totalCost;

      return {
        inputTokens: newInputTokens,
        outputTokens: newOutputTokens,
        toolCallCount: newToolCalls,
        inputCost: newInputCost,
        outputCost: newOutputCost,
        totalCost: newTotalCost,
        estimatedMonthly: newTotalCost * 30,
      };
    });

    sessionHistory.current.push({ cost: totalCost, timestamp: new Date().toISOString() });
  }, []);

  const addToolCost = useCallback((cost: number) => {
    setBreakdown((prev) => ({
      ...prev,
      toolCallCount: prev.toolCallCount + 1,
      totalCost: prev.totalCost + cost,
      estimatedMonthly: (prev.totalCost + cost) * 30,
    }));
  }, []);

  const reset = useCallback(() => {
    setBreakdown({
      inputTokens: 0,
      outputTokens: 0,
      toolCallCount: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      estimatedMonthly: 0,
    });
    sessionHistory.current = [];
  }, []);

  const formatCost = useCallback((cost: number): string => {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(2)}k`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }, []);

  const formatTokens = useCallback((tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  }, []);

  return {
    breakdown,
    addTokens,
    addToolCost,
    reset,
    formatCost,
    formatTokens,
  };
}
