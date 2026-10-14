import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Loader2, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

const TOPICS = [
  { value: "location", labelKey: "aiHub.train.topic.location", fallback: "العنوان والفروع" },
  { value: "hours", labelKey: "aiHub.train.topic.hours", fallback: "ساعات العمل" },
  { value: "delivery", labelKey: "aiHub.train.topic.delivery", fallback: "الشحن والتوصيل" },
  { value: "payment", labelKey: "aiHub.train.topic.payment", fallback: "طرق الدفع" },
  { value: "policy", labelKey: "aiHub.train.topic.policy", fallback: "السياسات والاستبدال" },
  { value: "prices", labelKey: "aiHub.train.topic.prices", fallback: "الأسعار والعروض" },
  { value: "contact", labelKey: "aiHub.train.topic.contact", fallback: "بيانات التواصل" },
  { value: "general", labelKey: "aiHub.train.topic.general", fallback: "معلومات عامة" },
] as const;

/**
 * AgentTrainingPage — teach the agent your business in plain words.
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
      toast.success(t("aiHub.train.saved", "تم تدريب وتحديث ذاكرة الوكيل بنجاح"));
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiHub.train.saveFailed", "فشل حفظ بيانات التدريب"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="border-b border-border/80 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h1 className="text-sm sm:text-base font-bold text-foreground">
              {t("aiHub.train.title", "تدريب وتغذية ذاكرة الوكيل الذكي")}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
            تغذية معرفية فورية
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Main Training Chassis */}
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">تغذية الوكيل بمعلومات النشاط بلغة طبيعية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("aiHub.train.subtitle", "قم بصياغة معلومات عملك بكلمات بسيطة. يقوم المحرك بتحليلها وتضمينها في قاعدة المعرفة المباشرة للوكيل.")}
            </p>
          </div>

          {/* Topic Select Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t("aiHub.train.topicLabel", "تصنيف المعرفة المستهدفة:")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((tp) => (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => setTopic(tp.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    topic === tp.value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/15 border border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(tp.labelKey, tp.fallback)}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {t("aiHub.train.whatToTeach", "النص أو التفاصيل المراد تعليمها للوكيل:")}
              </label>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {text.length} / 4000
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={4000}
              placeholder={t("aiHub.train.placeholder", "اكتب هنا تفاصيل مثل: مواعيد العمل من 9 صباحاً حتى 10 مساءً يومياً ما عدا الجمعة، التوصيل متاح لكافة المحافظات خلال 48 ساعة...") as string}
              className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/60 resize-y focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              {t("aiHub.train.hint", "سيتم تقسيم النص إلى حقائق وتضمينات دقيقة يسترجعها الوكيل فوراً أثناء محادثة العملاء.")}
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={handleTrain}
              disabled={!text.trim() || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs active:scale-97 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {t("aiHub.train.save", "حفظ وتدريب الوكيل")}
            </button>
          </div>
        </div>

        {/* Success / Result Panel */}
        {lastResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{`تم استخراج وتثبيت ${lastResult.saved} حقيقة معرفية بنجاح`}</span>
            </div>
            <ul className="space-y-1.5 divide-y divide-border/40">
              {lastResult.statements.map((s, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2 pt-1.5 first:pt-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{s.statement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
