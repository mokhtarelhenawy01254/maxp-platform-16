import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Assessment as EvalIcon,
  Clear as ClearIcon,
  ChevronLeft as PanelCloseIcon,
  ChevronRight as PanelOpenIcon,
} from "@mui/icons-material";
import { useAgentSandbox } from "./hooks/useAgentSandbox";
import { SessionList } from "./components/SessionList";
import { ChatArea } from "./components/ChatArea";
import { InspectorPanel } from "./components/InspectorPanel";
import { HeaderBar } from "./components/HeaderBar";
import { StatusBar } from "./components/StatusBar";
import type { ToolDefinition } from "./types/sandbox.types";

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
    currentEval,
    safetyChecks,
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

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  // Use lazy initialization to avoid capturing stale media-query state on first render
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => !isSmallScreen);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(() => !isSmallScreen);

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
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
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

      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onCreateSession={createSession}
          onDeleteSession={deleteSession}
          onUpdateTitle={updateSessionTitle}
          formatCost={formatCost}
          collapsed={!sidebarOpen}
          isSessionsLoading={isSessionsLoading}
        />

        <Box
          sx={{
            width: 28,
            minWidth: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Tooltip title={sidebarOpen ? "Hide sessions" : "Show sessions"}>
            <IconButton size="small" onClick={() => setSidebarOpen((p) => !p)} sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
              {sidebarOpen ? <PanelCloseIcon fontSize="small" /> : <PanelOpenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

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

        <Box
          sx={{
            width: 28,
            minWidth: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "1px solid",
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Tooltip title={inspectorOpen ? "Hide inspector" : "Show inspector"}>
            <IconButton size="small" onClick={() => setInspectorOpen((p) => !p)} sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
              {inspectorOpen ? <PanelCloseIcon fontSize="small" /> : <PanelOpenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <InspectorPanel
          tools={agentTools}
          activityLog={activityLog}
          evalScore={currentEval}
          safetyChecks={safetyChecks}
          onClearLog={clearActivityLog}
          collapsed={!inspectorOpen}
        />
      </Box>

      {activeSession && (
        <StatusBar
          messageCount={activeSession.messageCount}
          toolCallCount={activeSession.toolCallCount}
          totalTokens={activeSession.totalTokens}
          totalCost={activeSession.totalCost}
          avgLatency={activeSession.avgLatency}
          costBreakdown={costBreakdown}
          formatCost={formatCost}
          formatTokens={formatTokens}
        />
      )}

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Export Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Choose export format for the current session.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleExport("json")} variant="outlined">
            JSON
          </Button>
          <Button onClick={() => handleExport("markdown")} variant="contained">
            Markdown
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={clearError}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={clearError}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default AIAgentSandboxPage;
