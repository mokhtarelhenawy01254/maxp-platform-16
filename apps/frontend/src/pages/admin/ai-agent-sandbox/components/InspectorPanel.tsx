import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Activity, Trash2, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, Route, Server, Book, Check, Clipboard } from 'lucide-react';
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
  systemPrompt?: string;
  agentInstructions?: string;
  agentName?: string;
  agentRole?: string;
  agentDescription?: string;
  modelName?: string;
  providerName?: string;
  conversationMessages?: { role: string; content: string }[];
  agentSkills?: Array<{ id: string; name: string; description: string; allowedTools?: string[] }>;
  collapsed?: boolean;
  width?: number;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  tools,
  activityLog,
  traceSummary,
  onClearLog,
  systemPrompt = "",
  agentInstructions = "",
  agentName = "",
  agentRole = "",
  agentDescription = "",
  modelName = "",
  providerName = "",
  conversationMessages = [],
  agentSkills = [],
  collapsed = false,
  width = 288,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0); // 0 = Tools, 1 = Log
  const [logFilter, setLogFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const prevLogLength = useRef(activityLog.length);
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab !== 1) return;
    if (activityLog.length > prevLogLength.current && logScrollRef.current) {
      logScrollRef.current.scrollTo({ top: logScrollRef.current.scrollHeight, behavior: "smooth" });
    }
    prevLogLength.current = activityLog.length;
  }, [activityLog.length, tab]);

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
  const activeSkill = pipelineTrace?.activeSkill || null;
  const executedTools = pipelineTrace?.toolExecutions?.map((tool) => tool.name).filter(Boolean) || [];
  const messageTools = traceSummary?.toolCalls?.map((tool) => tool.name).filter(Boolean) || [];
  const toolNames = executedTools.length > 0 ? executedTools : messageTools;
  const confidence = pipelineTrace?.intentClassification?.confidence;
  const runtimeLabel = traceSummary?.runtime === "local-nodejs"
    ? t("aiHub.sandbox.trace.nodeRuntime")
    : traceSummary?.runtime
    ? t("aiHub.sandbox.trace.pythonRuntime")
    : t("aiHub.sandbox.trace.unknownRuntime");

  const zoomScale = Math.min(1.35, Math.max(1, width / 288));
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [copied, setCopied] = React.useState(false);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const promptSections = React.useMemo(() => {
    const s: Array<{ key: string; label: string; color: string; content: string }> = [];
    s.push({ key: "header", label: "SYSTEM — Agent Identity", color: "text-indigo-400", content:
      `You are ${agentName}, the ${agentRole} agent.\nDescription: ${agentDescription}`
    });
    if (activeSkill) {
      s.push({ key: "activeSkill", label: "ACTIVE SKILL — Last Turn", color: "text-purple-400", content:
        `  Skill: ${activeSkill.skillId}\n  Requires Approval: ${activeSkill.requiresHumanApproval}\n  Max Tool Count: ${activeSkill.maxToolCount}`
      });
    }
    s.push({ key: "routing", label: "Agent Routing", color: "text-sky-400", content:
      `  Role: ${agentRole}\n  Name: ${agentName}\n  Model: ${modelName || (traceSummary ? `${traceSummary.provider}/${traceSummary.model}` : "not set")}`
    });
    if (systemPrompt) {
      s.push({ key: "soul", label: "SOURCE: SOUL.md", color: "text-indigo-400", content: systemPrompt });
    }
    if (agentInstructions) {
      s.push({ key: "agents", label: "SOURCE: AGENTS.md", color: "text-emerald-400", content: agentInstructions });
    }
    if (tools.length > 0) {
      s.push({ key: "tools", label: "SOURCE: Allowed Tools", color: "text-amber-400", content:
        tools.map((t) => `  • ${t.name} (${t.sideEffect}) — ${t.description}`).join("\n")
      });
    }
    if (agentSkills.length > 0) {
      s.push({ key: "skills", label: "SOURCE: Loaded Skills", color: "text-purple-400", content:
        agentSkills.map((sk) => {
          const toolsList = sk.allowedTools?.length ? `\n    tools: ${sk.allowedTools.join(", ")}` : "";
          return `  • ${sk.name}: ${sk.description}${toolsList}`;
        }).join("\n")
      });
    }
    const recent = conversationMessages.slice(-10);
    if (recent.length > 0) {
      s.push({ key: "history", label: "SOURCE: Conversation History", color: "text-slate-400", content:
        recent.map((m) => `  ${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}`).join("\n")
      });
    }
    const lastUserMsg = [...conversationMessages].reverse().find((m) => m.role === "user");
    s.push({
      key: "input",
      label: lastUserMsg ? "Last User Input" : "Input (awaits)",
      color: "text-blue-400",
      content: lastUserMsg
        ? (lastUserMsg.content.length > 500 ? lastUserMsg.content.slice(0, 500) + "..." : lastUserMsg.content)
        : "<awaits user input>"
    });
    return s;
  }, [agentName, agentRole, agentDescription, systemPrompt, agentInstructions, tools, conversationMessages, agentSkills, modelName, traceSummary]);

  const fullText = React.useMemo(() => promptSections.map((s) => s.content).join("\n\n"), [promptSections]);
  const approxTokens = React.useMemo(() => Math.ceil(fullText.length / 3.5), [fullText]);
  const estimatedCost = React.useMemo(() => {
    const model = (modelName || traceSummary?.model || "").toLowerCase();
    let rate = 2.50;
    if (model.includes("mini")) rate = 0.15;
    else if (model.includes("haiku")) rate = 0.25;
    else if (model.includes("sonnet")) rate = 3.00;
    else if (model.includes("gpt-4")) rate = 2.50;
    else if (model.includes("claude")) rate = 3.00;
    return (approxTokens / 1_000_000) * rate;
  }, [approxTokens, modelName, traceSummary]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      <style>{`
        @keyframes log-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .log-entry-new {
          animation: log-fade-in 0.3s ease-out;
        }
      `}</style>
    <div
      className={`self-stretch flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 overflow-hidden ${
        collapsed ? "w-0 min-w-0" : ""
      }`}
      style={collapsed ? undefined : { width, minWidth: width }}
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
        <button
          onClick={() => setTab(2)}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            tab === 2
              ? "border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <BookOpen className="size-3.5" />
          <span>System</span>
        </button>
      </div>

      {/* Workspace scroll area */}
      <div ref={logScrollRef} className="flex-1 overflow-y-auto">
        <div className="p-3.5" style={{ zoom: zoomScale }}>
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
                  {activeSkill && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-purple-500">Active Skill</span>
                      <span className="min-w-0 break-all text-right font-mono text-purple-600 dark:text-purple-400">
                        {activeSkill.skillId}
                        {activeSkill.requiresHumanApproval && " (requires approval)"}
                      </span>
                    </div>
                  )}
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
                  <div key={entry.id} className="py-2.5 log-entry-new">
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

        {/* Tab 2: System Prompt */}
        {tab === 2 && (
          <>
            {(traceSummary?.pipelineTrace as any)?._compiledSystemPrompt ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    Actual Prompt from Python
                  </span>
                  <Badge variant="success" className="text-[9px] py-0 px-1.5">
                    Live
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                  <span>{((traceSummary?.pipelineTrace as any)?._compiledSystemPrompt as string).length.toLocaleString()} chars</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{Math.ceil(((traceSummary?.pipelineTrace as any)?._compiledSystemPrompt as string).length / 3.5).toLocaleString()} tokens</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="size-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  title={copied ? "Copied!" : "Copy prompt"}
                >
                  {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </Button>
                <div className="p-3 bg-slate-950 dark:bg-slate-950/70 border border-slate-800 rounded-lg overflow-x-auto text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                  {(traceSummary?.pipelineTrace as any)?._compiledSystemPrompt as string}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    Estimated Prompt (no live data yet)
                  </span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                    Compiled
                  </Badge>
                </div>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 rounded-lg p-2 text-[9px]">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <span>~{approxTokens.toLocaleString()} tokens</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{fullText.length.toLocaleString()} chars</span>
                    {modelName && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="font-mono text-slate-400">{modelName}</span>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono">
                    ~${estimatedCost.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="size-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    title={copied ? "Copied!" : "Copy prompt"}
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {promptSections.map((section) => {
                    const isCollapsed = collapsedSections.has(section.key);
                    return (
                      <div key={section.key} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <button
                          onClick={() => toggleSection(section.key)}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-slate-950/50 transition-colors select-none"
                        >
                          {isCollapsed ? <ChevronRight className="size-3 text-slate-400" /> : <ChevronDown className="size-3 text-slate-400" />}
                          <span className={section.color}>{section.label}</span>
                          <span className="ml-auto text-[9px] text-slate-400 font-mono">
                            {Math.ceil(section.content.length / 3.5).toLocaleString()} tok
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="p-2.5 bg-slate-950 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 overflow-x-auto text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {section.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
    </>
  );
};
