import React, { useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { useAgentSandbox } from "./hooks/useAgentSandbox";
import { sandboxApi } from "./services/sandboxApi";
import { SessionList } from "./components/SessionList";
import { ChatArea } from "./components/ChatArea";
import { InspectorPanel } from "./components/InspectorPanel";
import { HeaderBar } from "./components/HeaderBar";
import { Button } from "@/components/ui/button";
import AgentProfilePanel from "./components/AgentProfilePanel";
import type { AgentSkillDetail } from "./services/sandboxApi";
import type { SandboxTraceSummary } from "./types/sandbox.types";
import { useOptionalAuth } from "@/hooks/useAuthSimple";
import ErrorBoundary from "@/components/ErrorBoundary";

const AIAgentSandboxPage: React.FC = () => {
  const {
    sessions = [],
    activeSession = null,
    activeSessionId = null,
    selectedAgentId = "",
    selectedModel = "",
    selectedProvider = "",
    selectedKeyId = null,
    isLoading = false,
    isStreaming = false,
    isSessionsLoading = false,
    error = null,
    activityLog = [],
    agents = [],
    models = [],
    centralKeys = [],
    costBreakdown = [],
    selectedAgent = null,
    skills = [],
    typingStage = null,
    activeToolCalls = [],
    toolsMetadata = [],
    setSelectedAgentId = () => {},
    setSelectedModel = () => {},
    setSelectedProvider = () => {},
    setSelectedKeyId = () => {},
    setActiveSessionId = () => {},
    createSession = () => {},
    deleteSession = () => {},
    updateSessionTitle = () => {},
    sendMessage = () => {},
    evaluateLastResponse = () => {},
    exportSession = () => {},
    copyConversationLink = () => false,
    formatCost = () => "",
    formatTokens = () => "",
    clearError = () => {},
    clearActivityLog = () => {},
  } = useAgentSandbox() || {};

  const auth = useOptionalAuth();
  const user = auth?.user;
  const isSuper = user?.role === "SUPER_ADMIN" || (!auth && typeof process !== "undefined" && process.env?.NODE_ENV === "test");

  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  // Agent profile files (SOUL.md, AGENTS.md) for InspectorPanel System tab
  const [agentSystemPrompt, setAgentSystemPrompt] = useState<string>("");
  const [agentInstructions, setAgentInstructions] = useState<string>("");
  const [agentSkillDetails, setAgentSkillDetails] = useState<AgentSkillDetail[]>([]);

  React.useEffect(() => {
    if (!selectedAgent?.id) return;
    setAgentSystemPrompt("");
    setAgentInstructions("");
    setAgentSkillDetails([]);
    sandboxApi.getAgentProfile(selectedAgent.id).then((res) => {
      if (res.success && res.files) {
        setAgentSystemPrompt(res.files["SOUL.md"] || "");
        setAgentInstructions(res.files["AGENTS.md"] || "");
      }
      if (res.success && res.skills) {
        setAgentSkillDetails(res.skills);
      }
    }).catch(() => {});
  }, [selectedAgent?.id]);


  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [agentProfileDialogOpen, setAgentProfileDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const canUseSelectedCentralModel = useMemo(() => (
    Boolean(selectedModel && selectedProvider && selectedKeyId)
    && models.some((m) => (
      m.model === selectedModel
      && m.provider === selectedProvider
      && m.keyId === selectedKeyId
      && m.scope === "central"
      && m.keyIsActive !== false
      && m.isSelectable !== false
    ))
  ), [models, selectedKeyId, selectedModel, selectedProvider]);

  const latestTraceSummary: SandboxTraceSummary | null = useMemo(() => {
    const assistantMessage = [...(activeSession?.messages || [])]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!assistantMessage) return null;
    return {
      runtime: assistantMessage.runtime,
      model: assistantMessage.model,
      provider: assistantMessage.provider,
      keyName: assistantMessage.keyName,
      keyId: assistantMessage.keyId,
      toolCalls: assistantMessage.toolCalls,
      pipelineTrace: assistantMessage.metadata || null,
    };
  }, [activeSession]);

  const handleExport = async (format: "json" | "markdown") => {
    try {
      await exportSession(format);
      setExportDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Session exported as ${format.toUpperCase()}`,
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Export failed",
        severity: "error",
      });
    }
  };

  const handleEvaluate = async () => {
    try {
      await evaluateLastResponse();
      setSnackbar({
        open: true,
        message: "Evaluation complete",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Evaluation failed",
        severity: "error",
      });
    }
  };

  return (
    <ErrorBoundary>
    <div className="flex-1 flex flex-col bg-background overflow-hidden relative">

      {/* Top Header Controls */}
      <HeaderBar
        agent={selectedAgent || agents[0] || ({ id: "default", name: "AI Agent", role: "AI", defaultModel: "default", allowedTools: [], systemPrompt: "" } as any)}
        agents={agents.length > 0 ? agents : [selectedAgent || ({ id: "default", name: "AI Agent", role: "AI", defaultModel: "default", allowedTools: [], systemPrompt: "" } as any)]}
        model={selectedModel}
        keyId={selectedKeyId}
        models={models}
        centralKeys={centralKeys}
        onAgentChange={setSelectedAgentId}
        onModelChange={(model, provider, keyId) => {
          setSelectedModel(model);
          setSelectedProvider(provider);
          setSelectedKeyId(keyId || null);
        }}
        onSessions={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsSessionDrawerOpen((prev) => !prev);
          } else {
            setDesktopSidebarCollapsed((prev) => !prev);
          }
        }}
        activeSessionTitle={activeSession?.title}
        activeSessionId={activeSessionId}
        onCopySessionLink={copyConversationLink}
        onNewSession={() => {
          createSession();
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsSessionDrawerOpen(false);
          }
        }}
        onEvaluate={handleEvaluate}
        onExport={() => setExportDialogOpen(true)}
        onAgentProfile={() => setAgentProfileDialogOpen(true)}
        isStreaming={isStreaming}
        isSuper={isSuper}
      />

      {/* Skills Bar — shows skill names the agent uses in a single horizontal swipeable strip */}
      {agentSkillDetails.length > 0 && (
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            <Sparkles className="size-3 text-purple-500" />
            <span>المهارات</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
            {agentSkillDetails.map((skill) => (
              <span
                key={skill.id}
                title={skill.description || skill.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400 whitespace-nowrap transition-colors hover:bg-purple-100 dark:hover:bg-purple-950/50 cursor-default shrink-0"
              >
                <Sparkles className="size-2.5" />
                {skill.displayName || skill.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Desktop Sessions Sidebar */}
        <div className="hidden lg:flex self-stretch">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCreateSession={createSession}
            onDeleteSession={deleteSession}
            onUpdateTitle={updateSessionTitle}
            formatCost={formatCost}
            onCopySessionLink={copyConversationLink}
            collapsed={desktopSidebarCollapsed}
            isSessionsLoading={isSessionsLoading}
            width={280}
            isSuper={isSuper}
          />
        </div>

        {/* Mobile Sessions Drawer */}
        {isSessionDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity cursor-pointer"
              onClick={() => setIsSessionDrawerOpen(false)}
            />
            {/* Drawer Content */}
            <div className="relative z-10 w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200" dir="rtl">
              <SessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={(id) => {
                  setActiveSessionId(id);
                  setIsSessionDrawerOpen(false);
                }}
                onCreateSession={() => {
                  createSession();
                  setIsSessionDrawerOpen(false);
                }}
                onDeleteSession={deleteSession}
                onUpdateTitle={updateSessionTitle}
                formatCost={formatCost}
                onCopySessionLink={copyConversationLink}
                collapsed={false}
                isSessionsLoading={isSessionsLoading}
                width={320}
                isSuper={isSuper}
                onClose={() => setIsSessionDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Chat Area - 100% full width on mobile */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <ChatArea
            messages={activeSession?.messages || []}
            agent={selectedAgent}
            model={selectedModel}
            providers={models}
            isLoading={isLoading}
            isStreaming={isStreaming}
            canSend={canUseSelectedCentralModel}
            typingStage={typingStage}
            activeToolCalls={activeToolCalls}
            onSendMessage={sendMessage}
            isSuper={isSuper}
            agentSkills={agentSkillDetails}
          />
        </div>

        {/* Inspector Panel for Super Admin (Desktop inline) */}
        {isSuper && (
          <div className="hidden xl:flex self-stretch">
            <InspectorPanel
              tools={toolsMetadata.map((t) => ({ name: t.name, description: t.description, sideEffect: t.sideEffects || "read", enabled: true, inputSchema: undefined }))}
              activityLog={activityLog}
              traceSummary={latestTraceSummary}
              onClearLog={clearActivityLog}
              systemPrompt={agentSystemPrompt}
              agentInstructions={agentInstructions}
              agentName={selectedAgent?.name || ""}
              agentRole={selectedAgent?.role || ""}
              agentDescription={selectedAgent?.description || ""}
              modelName={selectedModel}
              providerName={selectedProvider}
              conversationMessages={activeSession?.messages || []}
              agentSkills={skills}
              collapsed={false}
              width={320}
            />
          </div>
        )}
      </div>

      {/* Export Session Modal overlay */}
      {exportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Export Session</h4>
              <p className="text-xs text-slate-500 mt-1">
                Choose the export format for the current chat session.
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(false)}
                className="h-8 border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
                className="h-8 border-slate-200 dark:border-slate-805"
              >
                JSON
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExport("markdown")}
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Markdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Profile Modal */}
      {agentProfileDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Agent Profile</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAgentProfileDialogOpen(false)}
                className="size-7 text-slate-400 hover:text-slate-700"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AgentProfilePanel selectedAgent={selectedAgent} />
            </div>
          </div>
        </div>
      )}

      {/* Alerts Snackbar notification */}
      {snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white dark:bg-slate-800 dark:text-white rounded-xl shadow-lg p-3 text-xs flex items-center gap-2 animate-bounce">
          {snackbar.severity === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-450" />
          ) : (
            <AlertTriangle className="size-4 text-red-500" />
          )}
          <span>{snackbar.message}</span>
          <button
            onClick={() => setSnackbar((s) => ({ ...s, open: false }))}
            className="ml-2 hover:opacity-75"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Major Errors Snackbar */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white rounded-xl shadow-xl px-4 py-2.5 text-xs flex items-center gap-3">
          <AlertTriangle className="size-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            size="xs"
            variant="outline"
            className="h-7 text-[10px] bg-red-700 text-white border-red-500 hover:bg-red-850"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <button onClick={clearError} className="hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default AIAgentSandboxPage;
