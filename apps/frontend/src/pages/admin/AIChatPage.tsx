import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Button,
  ButtonBase,
  Stack,
} from "@mui/material";
import {
  Send as SendIcon,
  DeleteOutline as ClearIcon,
  Add as AddIcon,
  Forum as SessionIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  AutoAwesome as SparkleIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import LinkifiedText from "../../components/common/LinkifiedText";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelSelection?: ModelSelection | null;
}

interface ModelSelection {
  provider?: string | null;
  model?: string | null;
  keyName?: string | null;
  selectedPool?: string | null;
  activeProvider?: string | null;
  manualOverride?: boolean | null;
  error?: string | null;
}

interface AgentInfo {
  spawned: boolean;
  id?: string;
  name?: string;
  role?: string;
  status?: string;
  model?: string;
  selectedModel?: string | null;
  selectedProvider?: string | null;
  hasLLM?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  participant?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function hasInternalToolSyntax(content = "") {
  return /CALL_TOOL\s*:|agenttool__|tool_calls|<\s*\/?\s*DSML|\bDSML\b|invoke\s+name\s*=/i.test(content);
}

function sanitizeMessages(items: ChatMessage[] = []) {
  return items.filter((message) => !(message.role === "assistant" && hasInternalToolSyntax(message.content)));
}

function normalizeModelSelection(value: any): ModelSelection | null {
  if (!value || typeof value !== "object") return null;
  const model = typeof value.model === "string" && value.model.trim() ? value.model.trim() : null;
  const provider = typeof value.provider === "string" && value.provider.trim() ? value.provider.trim() : null;
  if (!model && !provider) return null;
  return {
    provider,
    model,
    keyName: typeof value.keyName === "string" ? value.keyName : null,
    selectedPool: typeof value.selectedPool === "string" ? value.selectedPool : null,
    activeProvider: typeof value.activeProvider === "string" ? value.activeProvider : null,
    manualOverride: Boolean(value.manualOverride),
    error: typeof value.error === "string" ? value.error : null,
  };
}

function formatModelSelection(selection?: ModelSelection | null) {
  if (!selection) return "";
  return [selection.provider, selection.model].filter(Boolean).join(" / ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1 }}>
    <Avatar
      sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 16 }}
    >
      <BotIcon sx={{ fontSize: 18 }} />
    </Avatar>
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.2,
        borderRadius: "18px 18px 18px 4px",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        gap: 0.5,
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "primary.main",
            opacity: 0.7,
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.3}s`,
            "@keyframes pulse": {
              "0%, 100%": { transform: "scale(0.7)", opacity: 0.4 },
              "50%": { transform: "scale(1.2)", opacity: 1 },
            },
          }}
        />
      ))}
    </Paper>
  </Box>
);

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const modelLabel = !isUser ? formatModelSelection(message.modelSelection) : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 1,
        px: 2,
        py: 0.5,
        "&:hover .copy-btn": { opacity: 1 },
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          bgcolor: isUser ? "secondary.main" : "primary.main",
          fontSize: 16,
          mb: 0.5,
        }}
      >
        {isUser ? (
          <PersonIcon sx={{ fontSize: 18 }} />
        ) : (
          <BotIcon sx={{ fontSize: 18 }} />
        )}
      </Avatar>

      {/* Bubble */}
      <Box sx={{ maxWidth: "72%", minWidth: 60 }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: isUser
              ? "18px 18px 4px 18px"
              : "18px 18px 18px 4px",
            bgcolor: isUser ? "primary.light" : "background.paper",
            border: isUser ? "none" : "1px solid",
            borderColor: "divider",
            color: isUser ? "#111827" : "text.primary",
            whiteSpace: "pre-wrap",
            lineHeight: 1.65,
            fontSize: "0.92rem",
          }}
        >
          <LinkifiedText text={message.content} />
        </Paper>

        {/* Timestamp + copy */}
        <Box
          sx={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            alignItems: "center",
            gap: 0.5,
            mt: 0.4,
            px: 0.5,
          }}
        >
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
            {formatTime(message.timestamp)}
          </Typography>
          <Tooltip title={copied ? "تم النسخ!" : "نسخ"}>
            <IconButton
              className="copy-btn"
              size="small"
              onClick={handleCopy}
              sx={{
                opacity: 0,
                transition: "opacity 0.2s",
                p: 0.3,
                color: "text.disabled",
              }}
            >
              <CopyIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          {modelLabel && (
            <Tooltip
              title={[
                message.modelSelection?.keyName ? `Key: ${message.modelSelection.keyName}` : null,
                message.modelSelection?.selectedPool ? `Pool: ${message.modelSelection.selectedPool}` : null,
              ].filter(Boolean).join(" · ")}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "0.68rem",
                  fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                  direction: "ltr",
                  unicodeBidi: "plaintext",
                }}
              >
                {modelLabel}
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load history & agent status on mount ──────────────────────────────────
  useEffect(() => {
    loadSessions();
    loadStatus();
  }, []);

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(buildApiUrl("/ai/chat/sessions"), {
        headers: tokenManager.createAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(nextSessions);
      const active = nextSessions.find((session: ChatSession) => session.isActive) || nextSessions[0];
      if (active?.id) {
        setActiveSessionId(active.id);
        await loadHistory(active.id);
      } else {
        setMessages([]);
      }
    } catch {
      setError("فشل تحميل جلسات المحادثة");
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadHistory = async (sessionId = activeSessionId) => {
    setHistoryLoading(true);
    try {
      const url = sessionId
        ? buildApiUrl(`/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`)
        : buildApiUrl("/ai/chat/history");
      const res = await fetch(url, {
        headers: tokenManager.createAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(sanitizeMessages(data.messages));
      }
      if (data.session?.id) setActiveSessionId(data.session.id);
    } catch {
      // no history yet — that's fine
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const res = await fetch(buildApiUrl("/ai/chat/status"), {
        headers: tokenManager.createAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAgentInfo(data.agent);
    } catch {
      // non-critical
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildApiUrl("/ai/chat/message"), {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: text, sessionId: activeSessionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const requestError: any = new Error(data.error || "فشل الاتصال بالوكيل");
        requestError.modelSelection = data.modelSelection;
        throw requestError;
      }

      const modelSelection = normalizeModelSelection(data.modelSelection || data.agentInfo?.lastModelSelection);
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: String(data.reply || "").trim(),
        timestamp: new Date().toISOString(),
        modelSelection,
      };

      if (aiMsg.content && !hasInternalToolSyntax(aiMsg.content)) {
        setMessages((prev) => [...prev, aiMsg]);
      } else if (hasInternalToolSyntax(aiMsg.content)) {
        setError("تم منع عرض تعليمات داخلية خرجت من الموديل.");
      }
      if (data.agentInfo) {
        setAgentInfo({
          spawned: true,
          ...data.agentInfo,
          selectedModel: modelSelection?.model || data.agentInfo.selectedModel,
          selectedProvider: modelSelection?.provider || data.agentInfo.selectedProvider,
        });
      }
      if (data.session?.id) {
        setActiveSessionId(data.session.id);
        setSessions((prev) => {
          const without = prev.filter((session) => session.id !== data.session.id);
          return [{ ...data.session, isActive: true }, ...without.map((session) => ({ ...session, isActive: false }))];
        });
      }

      // Refresh agent info after first interaction
      if (!agentInfo?.spawned) loadStatus();
    } catch (err: any) {
      const selection = normalizeModelSelection(err?.modelSelection);
      const suffix = selection ? ` (${formatModelSelection(selection)})` : "";
      setError(`${err.message || "حدث خطأ غير متوقع"}${suffix}`);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, agentInfo, activeSessionId]);

  const clearHistory = async () => {
    try {
      const targetSessionId = activeSessionId;
      const url = targetSessionId
        ? buildApiUrl(`/ai/chat/sessions/${encodeURIComponent(targetSessionId)}`)
        : buildApiUrl("/ai/chat/history");
      const res = await fetch(url, {
        method: "DELETE",
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(nextSessions);
      const nextActive = nextSessions.find((session: ChatSession) => session.isActive) || nextSessions[0];
      setActiveSessionId(nextActive?.id || null);
      if (nextActive?.id) await loadHistory(nextActive.id);
      else setMessages([]);
      setAgentInfo(null);
      loadStatus();
    } catch {
      setError("فشل مسح المحادثة");
    }
  };

  const createSession = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(buildApiUrl("/ai/chat/sessions"), {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل إنشاء جلسة");
      setActiveSessionId(data.session.id);
      setSessions((prev) => [
        { ...data.session, isActive: true },
        ...prev.map((session) => ({ ...session, isActive: false })),
      ]);
      setMessages(Array.isArray(data.messages) ? sanitizeMessages(data.messages) : []);
      loadStatus();
    } catch (err: any) {
      setError(err.message || "فشل إنشاء جلسة");
    } finally {
      setHistoryLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const selectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setSessions((prev) => prev.map((session) => ({ ...session, isActive: session.id === sessionId })));
    await loadHistory(sessionId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const agentName = agentInfo?.name || "CEO Agent";
  const agentRole = agentInfo?.role || "CEO";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        bgcolor: "background.default",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: "primary.main",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          }}
        >
          <SparkleIcon />
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            {agentName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {agentRole === "CEO" ? "مساعدك الذكي لإدارة الأعمال" : agentRole}
          </Typography>
        </Box>

        {/* Model chip */}
        {agentInfo?.spawned && (agentInfo.selectedModel || agentInfo.model) && (
          <Chip
            label={`الموديل: ${agentInfo.selectedModel || agentInfo.model}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
          />
        )}

        {agentInfo?.selectedProvider && (
          <Chip
            label={`المزود: ${agentInfo.selectedProvider}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: "0.7rem" }}
          />
        )}

        {/* LLM status */}
        <Chip
          size="small"
          label={agentInfo?.hasLLM ? "LLM متصل" : "وضع تلقائي"}
          color={agentInfo?.hasLLM ? "success" : "default"}
          variant="outlined"
          sx={{ fontSize: "0.7rem" }}
        />

        {/* Clear button */}
        {messages.length > 0 && (
          <Tooltip title="مسح المحادثة">
            <IconButton size="small" onClick={clearHistory} color="error">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box
          sx={{
            width: { xs: 116, md: 260 },
            borderInlineEnd: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.25, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <SessionIcon fontSize="small" color="primary" />
            <Typography variant="body2" fontWeight={800} sx={{ display: { xs: "none", md: "block" }, flex: 1 }}>
              الجلسات
            </Typography>
            <Tooltip title="جلسة جديدة">
              <IconButton size="small" onClick={createSession} disabled={historyLoading}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box sx={{ flex: 1, overflowY: "auto", p: 0.75 }}>
            {sessionsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : sessions.length === 0 ? (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={createSession} sx={{ width: "100%" }}>
                جديدة
              </Button>
            ) : (
              <Stack spacing={0.75}>
                {sessions.map((session) => {
                  const active = session.id === activeSessionId;
                  return (
                    <ButtonBase
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      sx={{
                        width: "100%",
                        display: "block",
                        textAlign: "inherit",
                        borderRadius: 1,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: active ? "primary.main" : "divider",
                          bgcolor: active ? "action.selected" : "background.default",
                        }}
                      >
                        <Typography variant="body2" fontWeight={800} noWrap>
                          {session.title || "جلسة"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                          {formatTime(session.updatedAt || session.createdAt)}
                        </Typography>
                      </Paper>
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {historyLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ flex: 1 }} aria-hidden="true" />
        ) : (
          /* ── Message list ─────────────────────────────────────────────── */
          <>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mx: 2, mb: 1, flexShrink: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-end",
            borderRadius: 3,
            border: "1.5px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            px: 1.5,
            py: 0.5,
            transition: "border-color 0.2s",
            "&:focus-within": { borderColor: "primary.main" },
          }}
        >
          <TextField
            inputRef={inputRef}
            multiline
            maxRows={6}
            fullWidth
            placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{
              "& .MuiInputBase-root": { py: 0.8, fontSize: "0.92rem" },
              "& textarea": { resize: "none" },
            }}
          />
          <IconButton
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            color="primary"
            sx={{
              mb: 0.3,
              bgcolor: input.trim() && !loading ? "primary.main" : "transparent",
              color: input.trim() && !loading ? "primary.contrastText" : "text.disabled",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: input.trim() && !loading ? "primary.dark" : "transparent",
              },
              "&.Mui-disabled": { bgcolor: "transparent" },
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon sx={{ transform: "rotate(180deg)" }} />
            )}
          </IconButton>
        </Box>
      </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AIChatPage;
