import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Clipboard, Copy, MessageSquare, Navigation, Plus, Send, Sparkles, Star, Trash2, User } from 'lucide-react';
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import LinkifiedText from "../../components/common/LinkifiedText";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-2">
    <Avatar className="size-8 bg-primary">
      <AvatarFallback>
        <Bot className="size-4" />
      </AvatarFallback>
    </Avatar>
    <div className="flex items-center gap-1.5 rounded-[18px_18px_18px_4px] border bg-card px-4 py-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-primary"
          style={{
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  </div>
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
    <div
      className={cn(
        "flex items-end gap-2 px-3 py-1 group",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar
        className={cn(
          "mb-1 size-8 shrink-0",
          isUser ? "bg-secondary" : "bg-primary",
        )}
      >
        <AvatarFallback>
          {isUser ? (
            <User className="size-4" />
          ) : (
            <Bot className="size-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-[60px] max-w-[72%]">
        <div
          className={cn(
            "whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-[18px_18px_4px_18px] bg-primary/20 text-foreground"
              : "rounded-[18px_18px_18px_4px] border bg-card text-foreground",
          )}
        >
          <LinkifiedText text={message.content} />
        </div>

        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[0.7rem] text-muted-foreground/50">
            {formatTime(message.timestamp)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Copy className="size-3" />
          </Button>
          {modelLabel && (
            <span className="ltr font-mono text-[0.68rem] text-muted-foreground">
              {modelLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface AIChatPageProps {
  companyId?: string;
  fullHeight?: boolean;
}

const AIChatPage: React.FC<AIChatPageProps> = ({ companyId, fullHeight }) => {
  const cq = (url: string) =>
    companyId ? `${url}${url.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}` : url;
  const { derivedTheme } = useTheme();
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

  useEffect(() => {
    loadSessions();
    loadStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(buildApiUrl(cq("/ai/chat/sessions")), {
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
        ? buildApiUrl(cq(`/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`))
        : buildApiUrl(cq("/ai/chat/history"));
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
      const res = await fetch(buildApiUrl(cq("/ai/chat/status")), {
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
      const res = await fetch(buildApiUrl(cq("/ai/chat/message")), {
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
        ? buildApiUrl(cq(`/ai/chat/sessions/${encodeURIComponent(targetSessionId)}`))
        : buildApiUrl(cq("/ai/chat/history"));
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
      const res = await fetch(buildApiUrl(cq("/ai/chat/sessions")), {
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

  const agentName = agentInfo?.name || "CEO Agent";
  const agentRole = agentInfo?.role || "CEO";

  return (
    <div className={`flex ${fullHeight ? "h-full" : "h-[calc(100dvh-64px)]"} flex-col bg-background`}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b bg-card px-6 py-3">
        <Avatar
          className="size-10"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          }}
        >
          <AvatarFallback>
            <Sparkles className="size-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="text-base font-bold leading-tight">{agentName}</p>
          <span className="text-xs text-muted-foreground">
            {agentRole === "CEO" ? "مساعدك الذكي لإدارة الأعمال" : agentRole}
          </span>
        </div>

        {agentInfo?.spawned && (agentInfo.selectedModel || agentInfo.model) && (
          <Badge variant="outline" className="font-mono text-[0.7rem]">
            {`الموديل: ${agentInfo.selectedModel || agentInfo.model}`}
          </Badge>
        )}

        {agentInfo?.selectedProvider && (
          <Badge variant="outline" className="text-[0.7rem]">
            {`المزود: ${agentInfo.selectedProvider}`}
          </Badge>
        )}

        <Badge
          variant={agentInfo?.hasLLM ? "outline" : "secondary"}
          className={cn(
            "text-[0.7rem]",
            agentInfo?.hasLLM && "text-success",
          )}
        >
          {agentInfo?.hasLLM ? "LLM متصل" : "وضع تلقائي"}
        </Badge>

        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={clearHistory}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div
          className={cn(
            "flex shrink-0 flex-col border-l bg-card",
            "w-[116px] md:w-[260px]",
          )}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <MessageSquare className="size-4 text-primary" />
            <span className="hidden flex-1 text-sm font-extrabold md:block">
              الجلسات
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={createSession}
              disabled={historyLoading}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {sessionsLoading ? (
              <div className="flex justify-center pt-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : sessions.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={createSession}
                className="w-full"
              >
                <Plus className="mr-1 size-3.5" />
                جديدة
              </Button>
            ) : (
              sessions.map((session) => {
                const active = session.id === activeSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => selectSession(session.id)}
                    className={cn(
                      "w-full rounded-md border p-2.5 text-right transition-colors",
                      active
                        ? "border-primary bg-muted"
                        : "border-border bg-background",
                    )}
                  >
                    <p className="truncate text-sm font-extrabold">
                      {session.title || "جلسة"}
                    </p>
                    <p className="hidden text-xs text-muted-foreground md:block">
                      {formatTime(session.updatedAt || session.createdAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Messages area */}
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
            {historyLoading ? (
              <div className="flex justify-center pt-12">
                <LoadingSpinner size="md" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1" aria-hidden="true" />
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mx-4 mb-2 shrink-0 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => setError(null)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t bg-card px-4 pb-4 pt-2">
            <div className="flex items-end gap-2 rounded-xl border-[1.5px] border-border bg-background px-4 py-1.5 transition-colors focus-within:border-primary">
              <Textarea
                ref={inputRef}
                rows={1}
                maxLength={undefined}
                placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-[0.92rem] shadow-none focus-visible:ring-0"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className={cn(
                  "mb-0.5 transition-all",
                  input.trim() && !loading
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <Send className="size-4 rotate-180" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
