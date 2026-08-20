import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

const TOPICS = [
  { value: "location", labelKey: "aiHub.train.topic.location" },
  { value: "hours", labelKey: "aiHub.train.topic.hours" },
  { value: "delivery", labelKey: "aiHub.train.topic.delivery" },
  { value: "payment", labelKey: "aiHub.train.topic.payment" },
  { value: "policy", labelKey: "aiHub.train.topic.policy" },
  { value: "prices", labelKey: "aiHub.train.topic.prices" },
  { value: "contact", labelKey: "aiHub.train.topic.contact" },
  { value: "general", labelKey: "aiHub.train.topic.general" },
] as const;

/**
 * AgentTrainingPage ΓÇö teach the agent your business in plain words.
 * The backend splits the free-form text into knowledge embeddings the agent
 * retrieves when answering customers (same index as FAQ/Policy answers).
 */
export default function AgentTrainingPage() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<string>("general");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ saved: number; statements: { statement: string }[] } | null>(null);

  const handleTrain = async () => {
    const content = text.trim();
    if (!content || saving) return;
    setSaving(true);
    setLastResult(null);
    try {
      const res = await fetch(buildApiUrl("ai/knowledge-questions/train"), {
        method: "POST",
        headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, topic: topic || null }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || data.detail || "Training failed");
      }
      setLastResult(data.result);
      toast.success(t("aiHub.train.saved"));
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiHub.train.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <GraduationCap className="size-5 text-indigo-600" />
          {t("aiHub.train.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("aiHub.train.subtitle")}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("aiHub.train.topicLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((tp) => (
              <button
                key={tp.value}
                onClick={() => setTopic(tp.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  topic === tp.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-background text-muted-foreground border-input hover:bg-muted"
                }`}
              >
                {t(tp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("aiHub.train.whatToTeach")}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder={t("aiHub.train.placeholder") as string}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm resize-y"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-500" />
            {t("aiHub.train.hint")}
          </p>
        </div>

        <button
          onClick={handleTrain}
          disabled={!text.trim() || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {t("aiHub.train.save")}
        </button>
      </div>

      {lastResult && (
        <div className="rounded-xl border bg-green-50/60 dark:bg-green-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
            <Sparkles className="size-4" />
            {`${lastResult.saved} ${t("aiHub.train.savedFactsSuffix")}`}
          </div>
          <ul className="space-y-1.5">
            {lastResult.statements.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-green-600 shrink-0">Γ£ô</span>
                <span>{s.statement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
