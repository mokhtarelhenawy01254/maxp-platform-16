import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FlaskConical,
  ClipboardCheck,
  ArrowLeftRight,
  LayoutList,
  Sparkles,
  MessageSquare,
  Plus,
  Link2,
  Check
} from "lucide-react";
import { toast } from "sonner";
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
  activeSessionId?: string | null;
  activeSessionTitle?: string;
  onNewSession?: () => void;
  onCopySessionLink?: (sessionId?: string) => void;
  onEvaluate: () => void;
  onInspector?: () => void;
  onCompare?: () => void;
  onExport?: () => void;
  onAgentProfile?: () => void;
  isStreaming: boolean;
  isSuper?: boolean;
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
  activeSessionId,
  activeSessionTitle,
  onNewSession,
  onCopySessionLink,
  onEvaluate,
  onInspector,
  onCompare,
  onExport,
  onAgentProfile,
  isStreaming,
  isSuper = false,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
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
      <div className="px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <FlaskConical className="size-4 text-indigo-600" />
          <span>{isSuper ? "AI Agent Sandbox" : "المساعد الذكي"}</span>
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <span className="text-slate-500">
          {agents.length === 0 ? "No agents available" : "Select an agent"}
        </span>
      </div>
    );
  }

  return (
    <div className="px-2.5 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 text-xs select-none">
      {/* Top Row on Mobile: Title + Active Session Trigger + Quick Actions */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="size-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
            {isSuper ? "AI Agent Sandbox" : agent.name}
          </span>
          {isStreaming && (
            <span className="relative flex h-2 w-2 ml-1 flex-shrink-0" title="جاري الرد...">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Sessions Trigger Button & Conversation Link (Mobile & Compact View) */}
        <div className="flex items-center gap-1 shrink-0">
          {onSessions && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSessions}
              className="h-7 text-xs font-semibold flex items-center gap-1 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 max-w-[150px] truncate cursor-pointer active:scale-95 shadow-2xs"
              title="عرض الجلسات السابقة"
            >
              <MessageSquare className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{activeSessionTitle || "الجلسات"}</span>
            </Button>
          )}

          {activeSessionId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (onCopySessionLink) {
                  onCopySessionLink(activeSessionId);
                } else {
                  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://maxp.online";
                  const link = `${origin}/admin/ai-hub?tab=sandbox&sessionId=${encodeURIComponent(activeSessionId)}`;
                  navigator?.clipboard?.writeText?.(link);
                  toast.success("تم نسخ رابط المحادثة بنجاح");
                }
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="h-7 text-xs font-semibold flex items-center gap-1 px-2 rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title="نسخ رابط المحادثة"
              aria-label="نسخ رابط المحادثة"
            >
              {copiedLink ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Link2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline text-[11px]">نسخ رابط المحادثة</span>
                </>
              )}
            </Button>
          )}

          {onNewSession && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onNewSession}
              className="size-7 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer active:scale-95"
              title="جلسة جديدة"
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {isSuper && <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />}

      {/* Selectors Row: Agent & Model */}
      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
        {/* Agent Dropdown */}
        <div className="flex-1 sm:flex-initial min-w-0">
          <select
            value={agent.id}
            onChange={(e) => onAgentChange(e.target.value)}
            className="w-full sm:w-auto sm:max-w-[180px] h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium truncate cursor-pointer"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.role})
              </option>
            ))}
          </select>
        </div>

        {/* Model Dropdown */}
        {models.length > 0 && (
          <div className="flex-1 sm:flex-initial min-w-0">
            <select
              value={selectedValue}
              onChange={(e) => {
                const selected = models.find((m) => optionValue(m) === e.target.value);
                if (selected) onModelChange(selected.model, selected.provider, selected.keyId || null);
              }}
              className="w-full sm:w-auto sm:max-w-[200px] h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium truncate cursor-pointer"
            >
              {models.map((m) => (
                <option
                  key={optionValue(m)}
                  value={optionValue(m)}
                  disabled={m.isSelectable === false || m.keyIsActive === false}
                >
                  {m.label.replace(/🤖/g, "").trim()} ({m.provider}){m.keyName ? ` · ${m.keyName}${m.keyIsActive === false ? " (Inactive)" : ""}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isSuper && currentModel?.keyName && (
        <div className="hidden sm:block text-[10px] text-slate-500 pl-1">
          <span className="font-semibold block text-[9px] uppercase tracking-wider text-slate-400">Central Key</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">{currentModel.keyName}</span>
        </div>
      )}

      {isSuper && visibleCentralKeys.length > 0 && (
        <div className="hidden sm:flex items-center gap-1.5" data-testid="central-keys-list">
          <span className="text-[10px] text-slate-400 font-medium">Central Keys ({visibleCentralKeys.length}):</span>
          {visibleCentralKeys.map((key) => (
            <span
              key={key.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${key.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{key.name}</span>
              <span className="text-[9px] text-slate-400 font-normal">[{key.isActive ? "Active" : "Inactive"}]</span>
            </span>
          ))}
        </div>
      )}

      {isSuper && <div className="flex-1" />}

      {isSuper && (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onEvaluate}
          disabled={isStreaming}
          className="h-8 text-xs font-semibold flex items-center gap-1.5 px-2 sm:px-3 border-slate-200 dark:border-slate-850"
        >
          <ClipboardCheck className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Evaluate</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onInspector}
          className="h-8 text-xs font-semibold flex items-center gap-1.5 px-2 sm:px-3 border-slate-200 dark:border-slate-850 cursor-pointer"
        >
          <LayoutList className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Inspector</span>
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
      )}
    </div>
  );
};
