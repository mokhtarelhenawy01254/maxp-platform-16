import React, { useState } from "react";
import { Send, Loader2, Sparkles, RotateCcw, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

interface AgentQuickTestCardProps {
  agentId: string;
  agentName: string;
  agentIcon?: string;
}

export default function AgentQuickTestCard({
  agentId,
  agentName,
  agentIcon = "🤖",
}: AgentQuickTestCardProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg || loading || !agentId) return;

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch(buildApiUrl("ai-sandbox/chat"), {
        method: "POST",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          message: cleanMsg,
          sessionId: `quick-test-${agentId}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || data.message || `HTTP ${res.status}`);
      }

      setReply(data.reply || data.response || data.message || "");
      setLatencyMs(data.latencyMs || Date.now() - startTime);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("agentProfiles.quickTest.error", "تعذر الاتصال بالوكيل حالياً");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessage("");
    setReply(null);
    setLatencyMs(null);
    setError(null);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("agentProfiles.quickTest.title", "تجربة سريعة مع الوكيل")}
          </h3>
        </div>
        {reply && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3 mr-1" />
            {t("agentProfiles.quickTest.clear", "مسح")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("agentProfiles.quickTest.subtitle", "أرسل رسالة تجريبية لترى كيف سيرد هذا الوكيل على عملائك.")}
      </p>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("agentProfiles.quickTest.placeholder", "اكتب رسالة تجريبية (مثال: أهلاً، محتاج أعرف تفاصيل المنتجات والأسعار؟)")}
          disabled={loading}
          className="h-9 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !message.trim()}
          className="h-9 px-3 text-xs shrink-0"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5 ml-1" />
          )}
          {loading ? t("agentProfiles.quickTest.sending", "جارٍ الرد...") : t("agentProfiles.quickTest.send", "إرسال")}
        </Button>
      </form>

      {/* Reply Area */}
      {reply && (
        <div className="rounded-lg bg-muted/40 p-3 border border-border/40 space-y-2 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span>{agentIcon}</span>
              <span>{agentName}</span>
            </span>
            {latencyMs !== null && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {latencyMs}ms
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {reply}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
          <Bot className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
