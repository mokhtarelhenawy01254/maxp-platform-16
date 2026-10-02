import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  InboxArrowDownIcon,
  BoltIcon,
  UsersIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { AgentWorkload } from './types';

interface SupervisorDispatchStripProps {
  unassignedCount: number;
  agents: AgentWorkload[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  onAutoDistribute: () => Promise<void>;
  isDistributing: boolean;
  loadingWorkload: boolean;
}

export const SupervisorDispatchStrip: React.FC<SupervisorDispatchStripProps> = ({
  unassignedCount,
  agents,
  selectedAgentId,
  onSelectAgent,
  onAutoDistribute,
  isDistributing,
  loadingWorkload,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const isUnassignedSelected = selectedAgentId === 'unassigned';
  const isAllSelected = selectedAgentId === null || selectedAgentId === 'all';

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-3 py-1.5 backdrop-blur-sm sm:px-4">
      {/* Left: Unassigned pool trigger + 1-Click Auto-Distribute */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSelectAgent('unassigned')}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
            isUnassignedSelected
              ? 'bg-amber-500 text-amber-950 shadow-sm dark:bg-amber-400 dark:text-amber-950'
              : 'border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
          }`}
          title={isArabic ? 'عرض الطلبات غير الموزعة' : 'View unassigned orders'}
        >
          <InboxArrowDownIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? 'غير الموزع' : 'Unassigned'}</span>
          <span className="font-mono text-[11px] font-bold tabular-nums">
            ({unassignedCount})
          </span>
        </button>

        <button
          type="button"
          onClick={onAutoDistribute}
          disabled={isDistributing || unassignedCount === 0}
          className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50"
          title={isArabic ? 'توزيع الطلبات غير الموزعة تلقائياً على الفريق' : 'Auto distribute unassigned orders'}
        >
          {isDistributing ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BoltIcon className="h-3.5 w-3.5 text-amber-300" />
          )}
          <span>{isArabic ? 'توزيع تلقائي' : 'Auto-Distribute'}</span>
        </button>
      </div>

      {/* Vertical hairline divider */}
      <div className="hidden sm:block h-4 w-px bg-border/40 shrink-0 mx-1" aria-hidden="true" />

      {/* Center & Right: Agent Workload Chips */}
      <div className="flex flex-1 items-center justify-start sm:justify-end gap-1 overflow-x-auto ps-1 no-scrollbar">
        {/* All Team chip */}
        <button
          type="button"
          onClick={() => onSelectAgent(null)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-all ${
            isAllSelected
              ? 'bg-foreground text-background shadow-xs'
              : 'border border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          }`}
        >
          <UsersIcon className="h-3 w-3" />
          <span>{isArabic ? 'فريق العمل' : 'All Team'}</span>
        </button>

        {loadingWorkload && agents.length === 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">…</span>
        )}

        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border/40 bg-background text-foreground hover:bg-muted/40'
              }`}
              title={`${agent.name} — ${agent.pendingCount} معلق، ${agent.todayConfirmedCount} مؤكد اليوم`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  agent.availability === 'offline' ? 'bg-zinc-400' : 'bg-emerald-500'
                }`}
              />
              <span className="truncate max-w-[90px]">{agent.name}</span>
              <span className="font-mono text-[10px] font-bold tabular-nums opacity-85">
                {agent.pendingCount}
                <span className="opacity-60 font-normal"> / </span>
                {agent.todayConfirmedCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
