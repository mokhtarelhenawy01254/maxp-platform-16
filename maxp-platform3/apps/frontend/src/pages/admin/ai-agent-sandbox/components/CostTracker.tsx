import React from "react";
import { Badge } from "@/components/ui/badge";
import { CostBreakdown } from "../hooks/useCostTracker";

interface CostTrackerProps {
  breakdown: CostBreakdown;
  formatCost: (cost: number) => string;
  formatTokens: (tokens: number) => string;
}

export const CostTracker: React.FC<CostTrackerProps> = ({
  breakdown,
  formatCost,
  formatTokens,
}) => {
  return (
    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        Cost Breakdown
      </span>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Input Tokens</span>
          <span className="font-bold text-slate-850 dark:text-slate-100">
            {formatTokens(breakdown.inputTokens)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Output Tokens</span>
          <span className="font-bold text-slate-850 dark:text-slate-100">
            {formatTokens(breakdown.outputTokens)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Input Cost</span>
          <span className="font-bold text-sky-600 dark:text-sky-400">
            {formatCost(breakdown.inputCost)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Output Cost</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {formatCost(breakdown.outputCost)}
          </span>
        </div>
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">Tool Calls</span>
        <Badge variant="secondary" className="text-[10px] py-0 px-2">
          {breakdown.toolCallCount}
        </Badge>
      </div>

      <div className="flex justify-between items-center text-xs font-bold pt-1">
        <span className="text-slate-500">Total Cost</span>
        <span className="text-sm text-indigo-600 dark:text-indigo-400">
          {formatCost(breakdown.totalCost)}
        </span>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-900" title="Estimated monthly cost based on 30 sessions">
        <span>Est. Monthly</span>
        <span>{formatCost(breakdown.estimatedMonthly)}</span>
      </div>
    </div>
  );
};
