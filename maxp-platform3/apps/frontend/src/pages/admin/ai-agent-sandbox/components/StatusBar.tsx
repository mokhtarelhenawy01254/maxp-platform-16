import React from "react";
import { Badge } from "@/components/ui/badge";
import { CostBreakdown } from "../hooks/useCostTracker";

interface StatusBarProps {
  messageCount: number;
  toolCallCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  costBreakdown: CostBreakdown;
  formatCost: (cost: number) => string;
  formatTokens: (tokens: number) => string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  messageCount,
  toolCallCount,
  totalTokens,
  totalCost,
  avgLatency,
  costBreakdown,
  formatCost,
  formatTokens,
}) => {
  return (
    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap bg-white dark:bg-slate-900 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-[10px]" title="Messages">
          {messageCount} msgs
        </Badge>

        <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50" title="Tool Calls">
          {toolCallCount} tools
        </Badge>

        <Badge variant="outline" className="text-[10px] text-indigo-650 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50" title="Total Tokens">
          {formatTokens(totalTokens)} tokens
        </Badge>

        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50" title="Average Latency">
          {avgLatency.toFixed(0)}ms avg
        </Badge>
      </div>

      <div className="font-bold text-indigo-650 dark:text-indigo-400" title="Total Cost">
        {formatCost(totalCost)}
      </div>
    </div>
  );
};
