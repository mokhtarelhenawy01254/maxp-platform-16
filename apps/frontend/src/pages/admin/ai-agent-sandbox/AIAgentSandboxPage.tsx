import React, { useMemo, useState } from "react";
import {
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Share2,
  MessageSquare,
  LayoutList,
  Activity
} from "lucide-react";
import { useAgentSandbox } from "./hooks/useAgentSandbox";
import { SessionList } from "./components/SessionList";
import { ChatArea } from "./components/ChatArea";
import { InspectorPanel } from "./components/InspectorPanel";
import { HeaderBar } from "./components/HeaderBar";
import { StatusBar } from "./components/StatusBar";
import { Button } from "@/components/ui/button";
import type { SandboxTraceSummary, ToolDefinition } from "./types/sandbox.types";

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
    typingStage,
    activeToolCalls,
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
    clearActivityLog,
    clearError,
    toolsMetadata,
  } = useAgentSandbox();

  // Media query states implemented directly via window check / resize listener or basic defaults
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'sessions' | 'chat' | 'inspector'>('chat');


  const [exportDialogOpen, setExportDialogOpen] = useState(false);
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

  const agentTools: ToolDefinition[] = useMemo(() => {
    if (!selectedAgent) return [];
    const toolNames = selectedAgent.allowedTools;
    return toolNames.map((name) => {
      const meta = toolsMetadata.find(t => t.name === name);
      return {
        name,
        description: meta?.description || `Tool: ${name}`,
        sideEffect: (meta?.sideEffect || "read") as "read" | "write",
        enabled: true,
      };
    });
  }, [selectedAgent, toolsMetadata]);

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
    <div className="h-[calc(100dvh-140px)] md:h-[calc(100vh-140px)] flex flex-col bg-slate-50/20 dark:bg-slate-950 overflow-hidden relative p-2 md:p-4 md:m-6 bg-background border rounded-xl shadow-sm">
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
        onEvaluate={handleEvaluate}
        onExport={() => setExportDialogOpen(true)}
        isStreaming={isStreaming}
      />

       {/* Main Sandbox Workspace */}
       <div className="flex-1 flex overflow-hidden relative">
         {/* Left Session Pane */}
         <div className={`transition-all duration-300 ${activeMobilePanel === 'sessions' ? 'flex' : 'hidden'} md:flex`}>
           <SessionList
             sessions={sessions}
             activeSessionId={activeSessionId}
             onSelectSession={(id) => {
               setActiveSessionId(id);
               setActiveMobilePanel('chat');
             }}
             onCreateSession={createSession}
             onDeleteSession={deleteSession}
             onUpdateTitle={updateSessionTitle}
             formatCost={formatCost}
             collapsed={!sidebarOpen}
             isSessionsLoading={isSessionsLoading}
           />
         </div>
 
         {/* Sidebar Toggle Tab */}
         <div className="hidden md:flex w-7 min-w-[28px] border-r border-slate-200 dark:border-slate-800 flex-col justify-center items-center bg-white dark:bg-slate-900 select-none">
           <button
             onClick={() => setSidebarOpen((p) => !p)}
             className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650"
             title={sidebarOpen ? "Hide sessions" : "Show sessions"}
           >
             {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
           </button>
         </div>
 
         {/* Central Chat Board */}
         <div className={`flex-1 transition-all duration-300 ${activeMobilePanel === 'chat' ? 'flex' : 'hidden'} md:flex`}>
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
 
         {/* Inspector Panel Toggle Tab */}
         <div className="hidden md:flex w-7 min-w-[28px] border-l border-r border-slate-200 dark:border-slate-800 flex-col justify-center items-center bg-white dark:bg-slate-900 select-none">
           <button
             onClick={() => setInspectorOpen((p) => !p)}
             className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650"
             title={inspectorOpen ? "Hide inspector" : "Show inspector"}
           >
             {inspectorOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
           </button>
         </div>
 
         {/* Right Inspector Log & Tools Pane */}
         <div className={`transition-all duration-300 ${activeMobilePanel === 'inspector' ? 'flex' : 'hidden'} md:flex`}>
           <InspectorPanel
             tools={agentTools}
             activityLog={activityLog}
             traceSummary={latestTraceSummary}
             onClearLog={clearActivityLog}
             collapsed={!inspectorOpen}
           />
         </div>
       </div>

       {/* Footer Stats status bar */}
       {/* StatusBar removed as requested */}


       {/* Mobile Bottom Navigation */}
       <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2 flex justify-around items-center pb-safe">
         <button 
           onClick={() => setActiveMobilePanel('sessions')}
           className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeMobilePanel === 'sessions' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'text-slate-500 opacity-70'}`}
         >
           <LayoutList className="size-5" />
           <span className="text-[10px] font-medium">Sessions</span>
         </button>
         <button 
           onClick={() => setActiveMobilePanel('chat')}
           className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeMobilePanel === 'chat' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'text-slate-500 opacity-70'}`}
         >
           <MessageSquare className="size-5" />
           <span className="text-[10px] font-medium">Chat</span>
         </button>
         <button 
           onClick={() => setActiveMobilePanel('inspector')}
           className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeMobilePanel === 'inspector' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'text-slate-500 opacity-70'}`}
         >
           <Activity className="size-5" />
           <span className="text-[10px] font-medium">Inspector</span>
         </button>
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
