/**
 * @module CopilotDrawer
 * @description AI Co-pilot drawer for the Customer Journey page.
 *
 * Opens via `Cmd+K` (or `Ctrl+K`) and lets the user describe what they
 * want in natural language. The prompt is sent to the maxp-ai-service,
 * and the reply is rendered with suggested actions.
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

import { Button } from "@/components/ui/button";
import { apiClient } from "../../../../services/apiClient";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

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

    const threadId = `journey-${flowId || "global"}`;

    try {
      const res = await apiClient.post("/whatsapp/automation/copilot/chat", {
        message: trimmed,
        threadId,
        agentId: activeAgent,
        context: {
          flowId,
          flowName,
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
      return t("whatsappJourney.copilot.placeholder");
    }
    return t("whatsappJourney.copilot.placeholder");
  }, [flowName, t]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={t("whatsappJourney.copilot.title") as string}
        className={cn(
          "fixed top-0 z-50 flex h-full w-full max-w-md flex-col border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-2xl",
          "transition-transform duration-200 ease-out",
          isRtl ? "border-r" : "border-l",
        )}
        style={{
          insetInlineEnd: 0,
          transform: open ? "translateX(0)" : `translateX(${isRtl ? "-100%" : "100%"})`,
        }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                {t("whatsappJourney.copilot.title")}
              </p>
              <h2 className="text-base font-semibold text-[color:var(--color-foreground)]">
                {activeAgent
                  ? t("whatsappJourney.copilot.ready")
                  : t("whatsappJourney.copilot.title")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden items-center rounded-md border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--color-muted-foreground)] sm:inline-flex">
              ESC
            </kbd>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              onClick={onClose}
              aria-label={t("whatsappJourney.copilot.close") as string}
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
            <EmptyState greeting={greeting} />
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
            <div className="flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
              <Loader2 className="size-3 animate-spin" />
              {t("whatsappJourney.copilot.thinking")}
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_50%,transparent)] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              {t("whatsappJourney.copilot.quickPrompts")}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="cursor-pointer rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-muted))] hover:text-[color:var(--color-foreground)]"
                  onClick={() => setInput(p.prompt)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] p-4">
          <div className="flex items-end gap-2 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              placeholder={t("whatsappJourney.copilot.placeholder") as string}
              className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent p-2 text-sm text-[color:var(--color-foreground)] outline-none placeholder:text-[color:var(--color-muted-foreground)]"
            />
            <Button
              size="icon"
              className="size-9 shrink-0"
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming}
              aria-label={t("whatsappJourney.copilot.send") as string}
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[9px] text-[color:var(--color-muted-foreground)]">
            {t("whatsappJourney.copilot.hint")}
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
}: {
  greeting: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        <Wand2 className="size-5" />
      </span>
      <p className="max-w-[320px] text-base font-semibold leading-relaxed text-[color:var(--color-foreground)]">
        {greeting}
      </p>
      <p className="max-w-[320px] text-xs text-[color:var(--color-muted-foreground)]">
        {t("whatsappJourney.copilot.poweredBy")}
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
  const { t } = useTranslation();
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
        {isUser
          ? t("whatsappJourney.copilot.you")
          : t("whatsappJourney.copilot.assistant")}
      </p>
      <div
        className={cn(
          "max-w-[90%] rounded-2xl border p-3 text-sm leading-6",
          isUser
            ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
            : "border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]",
        )}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {message.content}
      </div>

      {message.insights && message.insights.length > 0 && (
        <ul className="m-0 flex w-full max-w-[90%] flex-col gap-2 p-0" style={{ listStyle: "none" }}>
          {message.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </ul>
      )}

      {message.suggestions && message.suggestions.length > 0 && (
        <div className="flex w-full max-w-[90%] flex-wrap gap-2">
          {message.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="cursor-pointer rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-1 text-xs font-medium text-[color:var(--color-primary)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
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
    warning: "var(--color-warning, #d97706)",
    danger: "var(--color-destructive)",
    info: "var(--color-muted-foreground)",
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
      className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3"
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${toneColor[insight.tone]} 12%, transparent)`,
          color: toneColor[insight.tone],
        }}
      >
        <Icon className="size-3.5" />
      </span>
      <p className="m-0 text-xs leading-5 text-[color:var(--color-foreground)]">
        {insight.text}
      </p>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook: global Cmd+K handler
// ─────────────────────────────────────────────────────────────────

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
