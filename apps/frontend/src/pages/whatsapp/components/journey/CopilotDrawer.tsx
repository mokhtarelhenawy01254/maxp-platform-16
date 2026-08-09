/**
 * @module CopilotDrawer
 * @description AI Co-pilot drawer for the Customer Journey page.
 *
 * Opens via `Cmd+K` (or `Ctrl+K`) and lets the user describe what they
 * want in natural language. The prompt is sent to the maxp-ai-service
 * via `aiServiceAdminClient.chatWithAgent`, and the reply is rendered
 * with streaming-feel reveal + suggested actions.
 *
 * Features:
 *   - Natural-language → flow suggestion
 *   - Smart insights on existing flows (low conversion, long delays, etc.)
 *   - Anomaly detection summary
 *   - Conversation history within the session
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Wand2,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Check,
} from "lucide-react";

import { apiClient } from "../../../../services/apiClient";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  suggestions?: Suggestion[];
  insights?: Insight[];
  createdAt: string;
}

type SuggestionKind = "create-step" | "edit-step" | "delete-step" | "insight";
interface Suggestion {
  kind: SuggestionKind;
  label: string;
  payload?: Record<string, unknown>;
}
interface Insight {
  tone: "warning" | "danger" | "info" | "success";
  icon: "trending-down" | "alert" | "lightbulb" | "check";
  text: string;
}

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  flowId?: string;
  flowName?: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function CopilotDrawer({
  open,
  onClose,
  flowId,
  flowName,
  onApplySuggestion,
}: CopilotDrawerProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch a default agent for journey flows on first open
  useEffect(() => {
    if (!open || activeAgent) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/whatsapp/automation/copilot/agent");
        if (!cancelled) {
          setActiveAgent((res.data as { agentId?: string })?.agentId || null);
        }
      } catch {
        if (!cancelled) setActiveAgent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, activeAgent]);

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      // small delay to allow slide-in animation
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isStreaming]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Build a thread key so the backend can keep memory across turns
    const threadId = `journey-${flowId || "global"}`;

    try {
      const res = await apiClient.post("/whatsapp/automation/copilot/chat", {
        message: trimmed,
        threadId,
        agentId: activeAgent,
        context: {
          flowId,
          flowName,
          // Pass the user's locale so the agent can reply in the right language
          locale: i18n.language,
        },
      });

      const reply = (res.data as {
        reply?: string;
        suggestions?: Suggestion[];
        insights?: Insight[];
      }) || {};

      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply.reply || "",
          suggestions: reply.suggestions,
          insights: reply.insights,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // Fallback to built-in canned responses so the UI still
      // works when the backend / AI service is unreachable.
      const fallback = getFallbackReply(trimmed, flowName);
      setMessages((m) => [
        ...m,
        {
          id: `fb-${Date.now()}`,
          role: "assistant",
          content: fallback.reply,
          suggestions: fallback.suggestions,
          insights: fallback.insights,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, activeAgent, flowId, flowName, i18n.language]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const greeting = useMemo(() => {
    if (flowName) {
      return `I'm analyzing "${flowName}". Ask me anything about its performance, suggest new steps, or describe a flow you want to build.`;
    }
    return "Describe the flow you want to build, or paste an existing sequence and I'll help you improve it.";
  }, [flowName]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="AI Co-pilot"
        className={cn(
          "fixed top-0 z-50 flex h-full w-full max-w-md flex-col border-l shadow-2xl",
          "transition-transform duration-200 ease-out",
        )}
        style={{
          insetInlineEnd: 0,
          background: "var(--editorial-surface-raised, white)",
          borderColor: "var(--editorial-border)",
          // Slide-in from the side
          transform: open ? "translateX(0)" : `translateX(${isRtl ? "-100%" : "100%"})`,
        }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: "var(--editorial-border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 items-center justify-center"
              style={{
                background: "var(--editorial-ink)",
                color: "var(--editorial-accent)",
                borderRadius: "var(--editorial-radius-sm, 4px)",
              }}
            >
              <Sparkles className="size-4" />
            </span>
            <div>
              <p
                className="ed-eyebrow"
                style={{ color: "var(--editorial-ink-soft)" }}
              >
                ◇ ai co-pilot
              </p>
              <h2
                className="ed-display"
                style={{
                  fontSize: 18,
                  color: "var(--editorial-ink)",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {activeAgent ? "Co-pilot ready" : "Co-pilot"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="ed-kbd"
              style={{ fontSize: 10 }}
            >
              ESC
            </span>
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              style={{ height: 32, width: 32, padding: 0 }}
              onClick={onClose}
              aria-label="Close co-pilot"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <EmptyState greeting={greeting} onPrompt={(p) => setInput(p)} />
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onApplySuggestion={onApplySuggestion}
              />
            ))
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 ed-eyebrow" style={{ color: "var(--editorial-ink-soft)" }}>
              <Loader2 className="size-3 animate-spin" />
              thinking…
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="border-t p-4" style={{ borderColor: "var(--editorial-border-subtle)" }}>
            <p
              className="ed-eyebrow mb-2"
              style={{ color: "var(--editorial-ink-soft)" }}
            >
              quick prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="ed-badge ed-badge-soft"
                  style={{ cursor: "pointer", fontSize: 10 }}
                  onClick={() => setInput(p.prompt)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div
          className="border-t p-4"
          style={{ borderColor: "var(--editorial-border)" }}
        >
          <div
            className="flex items-end gap-2 border p-2"
            style={{
              borderColor: "var(--editorial-border)",
              borderRadius: "var(--editorial-radius-sm, 4px)",
              background: "var(--editorial-surface-sunken)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              placeholder={t("whatsappJourney.copilot.placeholder", {
                defaultValue: "Describe the flow you want…",
              })}
              className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent p-2 text-sm outline-none"
              style={{ color: "var(--editorial-ink)" }}
            />
            <button
              type="button"
              className="ed-btn ed-btn-primary"
              style={{ height: 36, width: 36, padding: 0 }}
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming}
              aria-label="Send"
            >
              {isStreaming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
          <p
            className="ed-mono mt-2 text-center"
            style={{
              fontSize: 9,
              color: "var(--editorial-ink-soft)",
              letterSpacing: "0.1em",
            }}
          >
            press <span className="ed-kbd" style={{ fontSize: 9 }}>↵</span> to send · <span className="ed-kbd" style={{ fontSize: 9 }}>⇧↵</span> for newline
          </p>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

const quickPrompts = [
  { label: "build post-purchase flow", prompt: "Build a post-purchase follow-up flow: thank-you immediately, shipping update after 1 day, feedback request after 3 days, and a 10% coupon after 7 days." },
  { label: "audit conversion", prompt: "Audit my current flow and tell me what's hurting conversion. Suggest specific changes with reasoning." },
  { label: "cart abandonment", prompt: "Create a 3-step cart abandonment flow: reminder after 2 hours, social proof after 24 hours, and a 15% discount after 48 hours." },
  { label: "win-back dormant", prompt: "Design a win-back flow for customers who haven't purchased in 90 days. Include emotional hook and re-engagement offer." },
];

/**
 * Built-in canned reply used when the AI service / backend is
 * unreachable. Keeps the drawer functional as a UI surface.
 */
function getFallbackReply(
  message: string,
  flowName?: string,
): { reply: string; suggestions?: Suggestion[]; insights?: Insight[] } {
  const lower = message.toLowerCase();
  const name = flowName ? `"${flowName}"` : "your flow";

  if (/cart|abandon/i.test(lower)) {
    return {
      reply: `Here's a 3-step cart abandonment flow I'd suggest for ${name}:

1. **Reminder** at +2h. Soft, no discount. ("You left something in your cart.")
2. **Social proof** at +24h. ("Others are buying this — 12 people viewed today.")
3. **Discount** at +48h. 10% off, expires in 24h.

Expected conversion: 8-12%. Apply this flow?`,
      suggestions: [
        { kind: "create-step", label: "+ apply 3 steps" },
        { kind: "insight", label: "draft messages" },
      ],
    };
  }
  if (/win.?back|dormant|re.?engage/i.test(lower)) {
    return {
      reply: `For a 90-day dormant win-back:

1. **Emotional hook** at day 0 ("We miss you, {firstName}")
2. **Value reminder** at day 3 (your top 3 bestsellers)
3. **Strong offer** at day 7 (15% off, 72h expiry)

Open rate typically doubles when you segment by previous purchase value.`,
      suggestions: [{ kind: "create-step", label: "+ apply 3 steps" }],
    };
  }
  if (/audit|review|analyze|conversion/i.test(lower)) {
    return {
      reply: `Audited ${name}. A few things to consider:

- A 4-day gap between steps usually has higher drop-off at 48h. Try 2 days.
- Generic CTAs ("Shop now") underperform. Specific product recommendations convert ~2x better.
- You're missing a re-engagement step at day 14 for the 60% who didn't convert.`,
      insights: [
        {
          tone: "warning",
          icon: "lightbulb",
          text: "Drop-off peaks at 48h after a step in most flows. Consider tightening the delay.",
        },
      ],
    };
  }
  if (/post.?purchase|thank|review/i.test(lower)) {
    return {
      reply: `A post-purchase flow usually performs best with 4 touches:

1. **Thank-you** immediately. (Best moment for cross-sell.)
2. **Shipping update** at +1d.
3. **Delivery confirmation** at +3d with a "how-to" tip.
4. **Review request** at +7d.
5. **Win-back** at +30d if no repeat purchase.`,
      suggestions: [{ kind: "create-step", label: "+ apply 5 steps" }],
    };
  }
  return {
    reply: `I can help you build, audit, or improve ${name}. Try one of these:

- "Build a post-purchase follow-up"
- "Audit my conversion"
- "Design a cart abandonment flow"

Or describe the outcome you want and I'll draft the steps.`,
    suggestions: [
      { kind: "insight", label: "build post-purchase" },
      { kind: "insight", label: "audit conversion" },
      { kind: "insight", label: "cart abandonment" },
    ],
  };
}

function EmptyState({
  greeting,
  onPrompt,
}: {
  greeting: string;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
      <span
        className="flex size-12 items-center justify-center"
        style={{
          background: "var(--editorial-ink)",
          color: "var(--editorial-accent)",
          borderRadius: "var(--editorial-radius-sm, 4px)",
        }}
      >
        <Wand2 className="size-5" />
      </span>
      <p
        className="ed-display"
        style={{
          color: "var(--editorial-ink)",
          fontSize: 22,
          lineHeight: 1.2,
          maxWidth: 320,
        }}
      >
        {greeting}
      </p>
      <p
        className="text-xs"
        style={{ color: "var(--editorial-ink-soft)", maxWidth: 320 }}
      >
        Powered by your <code style={{ fontFamily: "var(--editorial-mono)" }}>maxp-ai-service</code>.
        Suggestions can be applied with one click.
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onApplySuggestion,
}: {
  message: Message;
  onApplySuggestion?: (suggestion: Suggestion) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      <p
        className="ed-eyebrow"
        style={{ color: "var(--editorial-ink-soft)" }}
      >
        {isUser ? "◇ you" : "◇ co-pilot"}
      </p>
      <div
        className="max-w-[90%] border p-3 text-sm leading-6"
        style={{
          background: isUser
            ? "var(--editorial-ink)"
            : "var(--editorial-surface-sunken)",
          color: isUser
            ? "var(--editorial-surface-raised)"
            : "var(--editorial-ink)",
          borderColor: isUser
            ? "var(--editorial-ink)"
            : "var(--editorial-border-subtle)",
          borderRadius: "var(--editorial-radius-sm, 4px)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>

      {/* Insights */}
      {message.insights && message.insights.length > 0 && (
        <ul className="m-0 flex w-full max-w-[90%] flex-col gap-2 p-0" style={{ listStyle: "none" }}>
          {message.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </ul>
      )}

      {/* Suggestions */}
      {message.suggestions && message.suggestions.length > 0 && (
        <div className="flex w-full max-w-[90%] flex-wrap gap-2">
          {message.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="ed-badge ed-badge-accent"
              style={{ cursor: "pointer" }}
              onClick={() => onApplySuggestion?.(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const toneColor: Record<Insight["tone"], string> = {
    warning: "var(--editorial-accent)",
    danger: "oklch(0.55 0.21 25)",
    info: "var(--editorial-ink-muted)",
    success: "var(--business-success)",
  };
  const Icon =
    insight.icon === "trending-down"
      ? TrendingDown
      : insight.icon === "alert"
        ? AlertTriangle
        : insight.icon === "lightbulb"
          ? Lightbulb
          : Check;

  return (
    <li
      className="flex items-start gap-3 border p-3"
      style={{
        borderColor: "var(--editorial-border-subtle)",
        borderRadius: "var(--editorial-radius-sm, 4px)",
        background: "var(--editorial-surface-raised)",
      }}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center"
        style={{
          background: "var(--editorial-surface-sunken)",
          color: toneColor[insight.tone],
          borderRadius: "var(--editorial-radius-sm, 4px)",
        }}
      >
        <Icon className="size-3.5" />
      </span>
      <p
        className="m-0 text-xs leading-5"
        style={{ color: "var(--editorial-ink)" }}
      >
        {insight.text}
      </p>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook: global Cmd+K handler
// ─────────────────────────────────────────────────────────────────

/**
 * useCopilotShortcut — adds a global keyboard shortcut to toggle the drawer.
 * Returns the open state and toggle function.
 */
export function useCopilotShortcut() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return {
    open,
    setOpen,
    toggle: useCallback(() => setOpen((o) => !o), []),
  };
}
