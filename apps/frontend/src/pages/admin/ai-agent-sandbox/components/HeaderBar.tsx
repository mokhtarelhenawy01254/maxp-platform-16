import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FlaskConical,
  ClipboardCheck,
  ArrowLeftRight,
  LayoutList,
  Sparkles
} from "lucide-react";
import type { AgentConfig, ModelConfig } from "../types/sandbox.types";
import type { CentralKeyConfig } from "../types/sandbox.types";

interface HeaderBarProps {
  agent: AgentConfig;
  agents: AgentConfig[];
  model: string;
  keyId?: string | null;
  models: ModelConfig[];
  centralKeys?: CentralKeyConfig[];
  onAgentChange: (agentId: string) => void;
  onModelChange: (model: string, provider: string, keyId?: string | null) => void;
  onSessions?: () => void;
  onEvaluate: () => void;
  onCompare?: () => void;
  onExport?: () => void;
  onAgentProfile?: () => void;
  isStreaming: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  agent,
  agents,
  model,
  keyId,
  models,
  centralKeys = [],
  onAgentChange,
  onModelChange,
  onSessions,
  onEvaluate,
  onCompare,
  onExport,
  onAgentProfile,
  isStreaming,
}) => {
  const optionValue = (m: ModelConfig) => `${m.provider}::${m.model}::${m.keyId || ""}`;
  const currentModel = models.find((m) => m.model === model && (!keyId || m.keyId === keyId))
    || models.find((m) => m.model === model);
  const selectedValue = currentModel ? optionValue(currentModel) : "";
  
  const visibleCentralKeys = centralKeys.length
    ? centralKeys
    : Object.values(models.reduce<Record<string, CentralKeyConfig>>((acc, m) => {
      if (m.keyId && m.keyName) {
        acc[m.keyId] = {
          id: m.keyId,
          name: m.keyName,
          provider: m.provider,
          keyType: "CENTRAL",
          scope: "central",
          isActive: m.keyIsActive !== false,
        };
      }
      return acc;
    }, {}));

  if (!agent || agents.length === 0) {
    return (
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <FlaskConical className="size-4 text-indigo-600" />
          <span>AI Agent Sandbox</span>
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <span className="text-slate-500">
          {agents.length === 0 ? "No agents available" : "Select an agent"}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3 bg-white dark:bg-slate-900 text-xs select-none">
      <div className="flex items-center gap-2 min-w-0">
        <FlaskConical className="size-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">AI Agent Sandbox</span>
        {isStreaming && (
          <span className="relative flex h-2 w-2 ml-1 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>
 
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
 
      {/* Agent Dropdown */}
      <div className="flex items-center gap-1.5 min-w-0">
        <select
          value={agent.id}
          onChange={(e) => onAgentChange(e.target.value)}
          className="rounded-md border border-slate-200 dark:border-slate-800 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-650 font-medium w-full sm:w-auto max-w-[160px] sm:max-w-[200px] truncate"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name} ({a.role})
            </option>
          ))}
        </select>
      </div>
 
      {/* Model Dropdown */}
      <div className="flex items-center gap-1.5 min-w-0">
        <select
          value={selectedValue}
          onChange={(e) => {
            const selected = models.find((m) => optionValue(m) === e.target.value);
            if (selected) onModelChange(selected.model, selected.provider, selected.keyId || null);
          }}
          className="rounded-md border border-slate-200 dark:border-slate-800 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-650 font-medium w-full sm:w-auto max-w-[180px] sm:max-w-[240px] truncate"
        >
          {models.map((m) => (
            <option
              key={optionValue(m)}
              value={optionValue(m)}
              disabled={m.isSelectable === false || m.keyIsActive === false}
            >
              {m.label} ({m.provider})
            </option>
          ))}
        </select>
      </div>

      {currentModel?.keyName && (
        <div className="hidden sm:block text-[10px] text-slate-500 pl-1">
          <span className="font-semibold block text-[9px] uppercase tracking-wider text-slate-400">Central Key</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">{currentModel.keyName}</span>
        </div>
      )}

      {visibleCentralKeys.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value=""
            disabled
            onChange={() => {}}
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-400 cursor-not-allowed"
          >
            <option value="">Central Keys ({visibleCentralKeys.length})</option>
            {visibleCentralKeys.map((key) => (
              <option key={key.id} value={key.id}>
                [{key.isActive ? "Active" : "Inactive"}] {key.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onEvaluate}
          disabled={isStreaming}
          className="h-8 text-xs font-semibold flex items-center gap-1.5 px-3 border-slate-200 dark:border-slate-850"
        >
          <ClipboardCheck className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Evaluate</span>
        </Button>

        {onSessions && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onSessions}
            className="size-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Toggle sessions sidebar"
          >
            <LayoutList className="size-4 text-slate-650" />
          </Button>
        )}

        {onAgentProfile && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onAgentProfile}
            className="size-8 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            title="Open agent profile"
          >
            <Sparkles className="size-4 text-indigo-500" />
          </Button>
        )}

        {onExport && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onExport}
            disabled={isStreaming}
            className="size-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Export Session"
          >
            <Download className="size-4 text-slate-650" />
          </Button>
        )}

        {onCompare && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onCompare}
            disabled={isStreaming}
            className="size-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Compare Models"
          >
            <ArrowLeftRight className="size-4 text-slate-650" />
          </Button>
        )}
      </div>
    </div>
  );
};
