import React, { useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  LayoutList,
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
import type { SandboxTraceSummary } from "./types/sandbox.types";

const AIAgentSandboxPage: React.FC = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    selectedAgentId,
    selectedModel,
    selectedProvider,
    selectedKeyId,
    isLoading,
    isStreaming,
    isSessionsLoading,
    error,
    activityLog,
    agents,
    models,
    centralKeys,
    costBreakdown,
    selectedAgent,
    skills,
    typingStage,
    activeToolCalls,
    toolsMetadata,
    setSelectedAgentId,
    setSelectedModel,
    setSelectedProvider,
    setSelectedKeyId,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSessionTitle,
    sendMessage,
    evaluateLastResponse,
    exportSession,
    formatCost,
    formatTokens,
    clearError,
    clearActivityLog,
  } = useAgentSandbox();

  // Agent profile files (SOUL.md, AGENTS.md) for InspectorPanel System tab
  const [agentSystemPrompt, setAgentSystemPrompt] = useState<string>("");
  const [agentInstructions, setAgentInstructions] = useState<string>("");

  React.useEffect(() => {
    if (!selectedAgent?.id) return;
    setAgentSystemPrompt("");
    setAgentInstructions("");
    sandboxApi.getAgentProfile(selectedAgent.id).then((res) => {
      if (res.success && res.files) {
        setAgentSystemPrompt(res.files["SOUL.md"] || "");
        setAgentInstructions(res.files["AGENTS.md"] || "");
      }
    }).catch(() => {});
  }, [selectedAgent?.id]);

  // Mobile-style overlay toggles
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setInspectorOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);


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
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <style>{`
        @keyframes slide-from-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slide-from-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes overlay-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Top Header Controls */}
      <HeaderBar
        agent={selectedAgent}
        agents={agents}
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
        onSessions={() => setSidebarOpen(true)}
        onEvaluate={handleEvaluate}
        onExport={() => setExportDialogOpen(true)}
        onAgentProfile={() => setAgentProfileDialogOpen(true)}
        isStreaming={isStreaming}
      />

      {/* Main workspace - single column chat */}
      <div className="flex-1 flex overflow-hidden relative">
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
        />
      </div>

      {/* Bottom Navigation - persistent mobile-style tab bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 select-none">
        <div className="flex justify-around items-center py-1.5 px-2">
          <button
            onClick={() => { setSidebarOpen(true); setInspectorOpen(false); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1 max-w-24 ${
              sidebarOpen
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <LayoutList className="size-5" />
            <span className="text-[10px] font-medium">Sessions</span>
          </button>
          <button
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1 max-w-24 ${
              !sidebarOpen && !inspectorOpen
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="size-5" />
            <span className="text-[10px] font-medium">Chat</span>
          </button>
          <button
            onClick={() => { setInspectorOpen(true); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1 max-w-24 ${
              inspectorOpen
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Sparkles className="size-5" />
            <span className="text-[10px] font-medium">Inspector</span>
          </button>
        </div>
      </div>

      {/* Sessions Overlay Drawer */}
      {sidebarOpen && (
        <div className="absolute inset-0 z-40 flex" style={{ animation: 'overlay-fade-in 200ms ease-out' }}>
          <div
            className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col relative"
            style={{ animation: 'slide-from-left 250ms ease-out', width: 300, minWidth: 300 }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-10 size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-4" />
            </button>
            <SessionList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                setActiveSessionId(id);
                setSidebarOpen(false);
              }}
              onCreateSession={createSession}
              onDeleteSession={deleteSession}
              onUpdateTitle={updateSessionTitle}
              formatCost={formatCost}
              collapsed={false}
              isSessionsLoading={isSessionsLoading}
              width={300}
            />
          </div>
          <div
            className="flex-1 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            style={{ animation: 'overlay-fade-in 200ms ease-out' }}
          />
        </div>
      )}

      {/* Inspector Overlay Drawer */}
      {inspectorOpen && (
        <div className="absolute inset-0 z-40 flex flex-row-reverse" style={{ animation: 'overlay-fade-in 200ms ease-out' }}>
          <div
            className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
            style={{ animation: 'slide-from-right 250ms ease-out' }}
          >
            <button
              onClick={() => setInspectorOpen(false)}
              className="absolute top-1 right-1 z-10 size-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/90 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-4" />
            </button>
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
          <div
            className="flex-1 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setInspectorOpen(false)}
            style={{ animation: 'overlay-fade-in 200ms ease-out' }}
          />
        </div>
      )}

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
  );
};

export default AIAgentSandboxPage;
