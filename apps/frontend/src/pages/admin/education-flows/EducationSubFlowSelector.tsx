import React from 'react';
import {
  Users,
  CalendarCheck,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import type { FlowSubId, SubFlowDefinition } from './types';

interface EducationSubFlowSelectorProps {
  subFlows: SubFlowDefinition[];
  activeSubFlowId: FlowSubId;
  onSelectSubFlow: (id: FlowSubId) => void;
}

export const EducationSubFlowSelector: React.FC<EducationSubFlowSelectorProps> = ({
  subFlows,
  activeSubFlowId,
  onSelectSubFlow,
}) => {
  const getSubFlowIcon = (id: FlowSubId) => {
    switch (id) {
      case 'acquisition':
        return <Users className="w-4 h-4" />;
      case 'attendance':
        return <CalendarCheck className="w-4 h-4" />;
      case 'placement':
        return <CreditCard className="w-4 h-4" />;
      case 'retention':
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const getWindowBadgeStyle = (windowFocus: SubFlowDefinition['windowFocus']) => {
    switch (windowFocus) {
      case 'IN_24H':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'HYBRID':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'OUT_24H':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  const getWindowBadgeLabel = (windowFocus: SubFlowDefinition['windowFocus']) => {
    switch (windowFocus) {
      case 'IN_24H':
        return 'داخل نافذة 24h';
      case 'HYBRID':
        return 'هجين (داخل/خارج 24h)';
      case 'OUT_24H':
        return 'خارج نافذة 24h (Utility)';
    }
  };

  return (
    <div className="bg-card/50 border-b border-border px-3 py-2 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {subFlows.map((flow) => {
          const isActive = activeSubFlowId === flow.id;
          return (
            <button
              key={flow.id}
              type="button"
              onClick={() => onSelectSubFlow(flow.id)}
              className={`text-right p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                isActive
                  ? 'bg-background border-primary/40 shadow-xs ring-1 ring-primary/20'
                  : 'bg-card/60 hover:bg-muted/40 border-border text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-1.5 rounded-lg ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {getSubFlowIcon(flow.id)}
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getWindowBadgeStyle(
                    flow.windowFocus,
                  )}`}
                >
                  {getWindowBadgeLabel(flow.windowFocus)}
                </span>
              </div>

              <div>
                <h3
                  className={`font-semibold line-clamp-1 ${
                    isActive ? 'text-foreground' : 'text-foreground/80'
                  }`}
                >
                  {flow.titleAr}
                </h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {flow.targetOutcomeAr}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {flow.nodes.length}
                </span>
                <span>خطوات متسلسلة</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-[10px] text-primary/80 font-medium truncate">
                  {flow.channelBadges.slice(0, 2).join(' + ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
