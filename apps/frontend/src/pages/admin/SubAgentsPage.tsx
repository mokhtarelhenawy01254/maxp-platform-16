import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  ArrowLeft,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import i18n from "../../i18n";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface CompanyAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  tools: string[];
  model?: string;
  soul?: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  department_id?: string;
  template_slug?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

const AGENTS_API = "proxy/ai-service/agents";
const CEO_CHAT_API = "ai/chat/message";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function SubAgentsPage() {
  const isMobile = useIsMobile();

  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<CompanyAgent | null>(null);
  const [chatMode, setChatMode] = useState<"agent" | "ceo">("agent");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(AGENTS_API), {
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setAgents(data.agents || []);
      else throw new Error(data.error || i18n.t("subAgents.loadFailed"));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSelectAgent = (agent: CompanyAgent) => {
    setSelectedAgent(agent);
    setChatMode("agent");
    setMessages([]);
    if (isMobile) setDrawerOpen(false);
  };

  const handleCeoChat = () => {
    setSelectedAgent(null);
    setChatMode("ceo");
    setMessages([]);
    if (isMobile) setDrawerOpen(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      if (chatMode === "ceo") {
        const res = await fetch(buildApiUrl(CEO_CHAT_API), {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (data.success) {
          const aiMsg: ChatMessage = { role: "assistant", content: String(data.reply || "").trim(), timestamp: new Date().toISOString() };
          setMessages((prev) => [...prev, aiMsg]);
        } else throw new Error(data.error || i18n.t("subAgents.failed"));
      } else if (selectedAgent) {
        const res = await fetch(buildApiUrl(`${AGENTS_API}/chat`), {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ message: text, agentId: selectedAgent.id }),
        });
        const data = await res.json();
        if (data.success) {
          const aiMsg: ChatMessage = { role: "assistant", content: String(data.reply || "").trim(), timestamp: new Date().toISOString() };
          setMessages((prev) => [...prev, aiMsg]);
        } else throw new Error(data.error || i18n.t("subAgents.failed"));
      }
    } catch (err: any) {
      const errMsg: ChatMessage = { role: "assistant", content: `${i18n.t("subAgents.errorPrefix")}: ${err.message}`, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const agentList = (
    <div className="flex h-full flex-col p-4">
      <h2 className="mb-4 text-lg font-bold">{i18n.t("subAgents.title")}</h2>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-auto">
          <button
            onClick={handleCeoChat}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-lg p-3 text-right transition-colors",
              chatMode === "ceo" && !selectedAgent
                ? "bg-muted"
                : "hover:bg-muted/50",
            )}
          >
            <Avatar className="size-10 bg-primary">
              <AvatarFallback>
                <Bot className="size-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-sm font-medium">{i18n.t("subAgents.ceoAgent")}</p>
              <p className="text-xs text-muted-foreground">{i18n.t("subAgents.ceoAgentDesc")}</p>
            </div>
          </button>
          <Separator className="my-3" />
          {agents.filter((a) => a.role !== "CEO").map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-3 text-right transition-colors",
                selectedAgent?.id === agent.id
                  ? "bg-muted"
                  : "hover:bg-muted/50",
              )}
            >
              <Avatar
                className={cn(
                  "size-10",
                  agent.status === "ACTIVE" ? "bg-success" : "bg-muted-foreground/50",
                )}
              >
                <AvatarFallback>
                  {agent.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-medium">{agent.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[0.65rem]">
                    {agent.role}
                  </Badge>
                  <Badge
                    variant={agent.status === "ACTIVE" ? "default" : "outline"}
                    className="text-[0.65rem]"
                  >
                    {agent.status}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const chatPanel = (
    <div className="flex h-full flex-col">
      {isMobile && (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">
            {chatMode === "ceo" ? i18n.t("subAgents.ceoAgent") : selectedAgent?.name || i18n.t("subAgents.chat")}
          </span>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center opacity-50">
            <Bot className="mb-3 size-14" />
            <p className="text-lg font-semibold">{i18n.t("subAgents.startChat")}</p>
            <p className="text-sm text-muted-foreground">
              {chatMode === "ceo"
                ? i18n.t("subAgents.talkToCeo")
                : i18n.t("subAgents.askAgent", { name: selectedAgent?.name || i18n.t("subAgents.agent") })}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3 shadow-sm",
                  msg.role === "user"
                    ? "bg-primary/20"
                    : "bg-muted",
                )}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  {msg.role === "user" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder={i18n.t("subAgents.placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
          >
            {sending ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const agentDetailPanel = selectedAgent && !isMobile ? (
    <div className="h-full space-y-4 overflow-auto p-4">
      <h3 className="text-sm font-bold">{i18n.t("subAgents.agentDetails")}</h3>
      <div className="space-y-3">
        <div>
          <span className="text-xs text-muted-foreground">{i18n.t("subAgents.name")}</span>
          <p className="text-sm">{selectedAgent.name}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">{i18n.t("subAgents.role")}</span>
          <div className="mt-0.5">
            <Badge>{selectedAgent.role}</Badge>
          </div>
        </div>
        {selectedAgent.model && (
          <div>
            <span className="text-xs text-muted-foreground">{i18n.t("subAgents.model")}</span>
            <p className="text-sm">{selectedAgent.model}</p>
          </div>
        )}
        {selectedAgent.soul && (
          <div>
            <span className="text-xs text-muted-foreground">{i18n.t("subAgents.instructions")}</span>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {selectedAgent.soul.length > 200 ? `${selectedAgent.soul.slice(0, 200)}...` : selectedAgent.soul}
            </p>
          </div>
        )}
        <Separator />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wrench className="size-3" /> {i18n.t("subAgents.tools")} ({selectedAgent.tools?.length || 0})
        </span>
        {selectedAgent.tools?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedAgent.tools.map((tool, i) => (
              <Badge key={i} variant="outline" className="text-[0.65rem]">
                {tool}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{i18n.t("subAgents.noTools")}</p>
        )}
      </div>
    </div>
  ) : null;

  if (error) {
    return (
      <div className="p-6">
        <div
          className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchAgents}>
            {i18n.t("subAgents.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[300px] p-0">
            {agentList}
          </SheetContent>
        </Sheet>
        {chatPanel}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-[300px] overflow-auto border-l bg-card">
        {agentList}
      </div>
      <div className="flex-1">{chatPanel}</div>
      {agentDetailPanel && (
        <div className="w-[280px] border-r bg-card">
          {agentDetailPanel}
        </div>
      )}
    </div>
  );
}
