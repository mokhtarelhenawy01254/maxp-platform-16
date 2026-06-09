import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Wrench,
  Activity,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Route,
  Cpu
} from "lucide-react";
import type {
  SandboxTraceSummary,
  ToolDefinition,
  ActivityLogEntry,
} from "../types/sandbox.types";

interface InspectorPanelProps {
  tools: ToolDefinition[];
  activityLog: ActivityLogEntry[];
  traceSummary?: SandboxTraceSummary | null;
  onClearLog: () => void;
  collapsed?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tools,
  activityLog,
  traceSummary,
  onClearLog,
  collapsed = false,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0); // 0 = Tools, 1 = Log
  const [logFilter, setLogFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const readTools = tools.filter((t) => t.sideEffect === "read");
  const writeTools = tools.filter((t) => t.sideEffect === "write");

  const filteredLog = activityLog.filter((entry) => {
    if (logFilter === "all") return true;
    if (logFilter === "errors") return entry.type === "error";
    return entry.type === logFilter;
  });
  const pipelineTrace = traceSummary?.pipelineTrace || null;
  const intent = pipelineTrace?.intentClassification?.intent || pipelineTrace?.toolPlan?.intent || null;
  const plannedTool = pipelineTrace?.toolPlan?.primaryTool || null;
  const executedTools = pipelineTrace?.toolExecutions?.map((tool) => tool.name).filter(Boolean) || [];
  const messageTools = traceSummary?.toolCalls?.map((tool) => tool.name).filter(Boolean) || [];
  const toolNames = executedTools.length > 0 ? executedTools : messageTools;
  const confidence = pipelineTrace?.intentClassification?.confidence;
  const runtimeLabel = traceSummary?.runtime === "local-nodejs"
    ? t("aiHub.sandbox.trace.nodeRuntime")
    : traceSummary?.runtime
    ? t("aiHub.sandbox.trace.pythonRuntime")
    : t("aiHub.sandbox.trace.unknownRuntime");

  return (
    <div
      className={`h-full flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 overflow-hidden ${
        collapsed ? "w-0 min-w-0" : "w-72 min-w-72"
      }`}
    >
      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 select-none">
        <button
          onClick={() => setTab(0)}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            tab === 0
              ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Wrench className="size-3.5" />
          <span>Tools</span>
        </button>
        <button
          onClick={() => setTab(1)}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            tab === 1
              ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Activity className="size-3.5" />
          <span>Log</span>
        </button>
      </div>

      {/* Workspace scroll area */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {/* Tab 0: Tools */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                Agent Tools ({tools.length})
              </span>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-medium">
                  {readTools.length} read
                </Badge>
                <Badge variant="warning" className="text-[9px] py-0 px-1.5 font-medium flex items-center gap-0.5">
                  <AlertTriangle className="size-2.5" />
                  <span>{writeTools.length} write</span>
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    tool.sideEffect === "write"
                      ? "border-amber-200 bg-amber-50/15 dark:border-amber-900/40 dark:bg-amber-950/10"
                      : "border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {tool.name}
                      </span>
                      {tool.sideEffect === "write" && (
                        <AlertTriangle className="size-3 text-amber-500 flex-shrink-0" title="This tool modifies data - use with caution" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 truncate mt-0.5">
                      {tool.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                    <Badge variant={tool.sideEffect === "read" ? "secondary" : "warning"} className="text-[9px] py-0 px-1 font-bold">
                      {tool.sideEffect}
                    </Badge>
                    <Switch checked={tool.enabled} disabled className="scale-75" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Activity Logs */}
        {tab === 1 && (
          <div className="space-y-3">
            {traceSummary && (
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Cpu className="size-3.5 flex-shrink-0 text-emerald-650 dark:text-emerald-400" />
                    <span className="truncate font-bold text-slate-800 dark:text-slate-150">
                      {t("aiHub.sandbox.trace.title")}
                    </span>
                  </div>
                  <Badge variant="success" className="shrink-0 text-[9px] py-0 px-1.5">
                    {runtimeLabel}
                  </Badge>
                </div>

                <div className="mt-2 space-y-1.5 text-[10px] text-slate-600 dark:text-slate-350">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-450">{t("aiHub.sandbox.trace.model")}</span>
                    <span className="min-w-0 break-all text-right font-mono text-slate-750 dark:text-slate-200">
                      {[traceSummary.provider, traceSummary.model].filter(Boolean).join(" / ") || t("aiHub.sandbox.trace.notAvailable")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-450">{t("aiHub.sandbox.trace.intent")}</span>
                    <span className="min-w-0 break-all text-right font-mono text-slate-750 dark:text-slate-200">
                      {intent || t("aiHub.sandbox.trace.notAvailable")}
                      {typeof confidence === "number" ? ` (${Math.round(confidence * 100)}%)` : ""}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-450">{t("aiHub.sandbox.trace.plannedTool")}</span>
                    <span className="min-w-0 break-all text-right font-mono text-slate-750 dark:text-slate-200">
                      {plannedTool || t("aiHub.sandbox.trace.notAvailable")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-450">{t("aiHub.sandbox.trace.executedTools")}</span>
                    <span className="min-w-0 break-all text-right font-mono text-slate-750 dark:text-slate-200">
                      {toolNames.length > 0 ? toolNames.join(", ") : t("aiHub.sandbox.trace.none")}
                    </span>
                  </div>
                </div>

                {pipelineTrace?.toolPlan?.reason && (
                  <div className="mt-2 rounded border border-emerald-200/70 bg-white/60 p-2 text-[10px] leading-relaxed text-slate-600 dark:border-emerald-900/50 dark:bg-slate-950/30 dark:text-slate-300">
                    <Route className="mr-1 inline size-3 text-emerald-650 dark:text-emerald-400" />
                    {pipelineTrace.toolPlan.reason}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Activity ({filteredLog.length})
              </span>

              {/* Filters */}
              <div className="flex flex-wrap gap-1">
                {["all", "input", "plan", "tool_call", "reply", "error"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setLogFilter(type)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                      logFilter === type
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-background border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                    }`}
                  >
                    {type === "all"
                      ? "All"
                      : type === "plan"
                      ? "Pipeline"
                      : type === "tool_call"
                      ? "Tools"
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end select-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearLog}
                className="size-7 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-850"
                title="Clear Log"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            {filteredLog.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-6 bg-slate-50/50 dark:bg-slate-955/20 border border-dashed rounded-xl">
                No activity yet. Start chatting.
              </p>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLog.map((entry) => {
                const isExpanded = expandedLogId === entry.id;
                return (
                  <div key={entry.id} className="py-2.5">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                      className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
                    >
                      <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 min-w-[42px] flex-shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </span>
                      <span className="flex-shrink-0">{entry.icon}</span>
                      <span className="font-bold text-slate-750 dark:text-slate-250 truncate flex-1">
                        {entry.title}
                      </span>
                      {entry.latencyMs !== undefined && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 text-slate-400 flex-shrink-0 scale-90">
                          {entry.latencyMs}ms
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="size-3.5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="size-3.5 text-slate-400 flex-shrink-0" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="pl-14 pt-1.5 text-[10px] text-slate-500 space-y-1.5 leading-relaxed break-all">
                        <p>{entry.details}</p>
                        {entry.metadata && (
                          <div className="p-2 bg-slate-950 dark:bg-slate-950/70 border border-slate-850 rounded overflow-x-auto text-[9px] font-mono text-slate-300 whitespace-pre-wrap leading-normal">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
