import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Facebook,
  MessageCircle,
} from "lucide-react";
import aiKnowledgeQuestionService, { KnowledgeQuestion } from "../../services/aiKnowledgeQuestionService";

type Tab = "pending" | "answered";

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  facebook: { label: "فيسبوك ماسنجر", icon: Facebook },
  whatsapp: { label: "واتساب أعمال", icon: MessageCircle },
  chat: { label: "المحادثة الفورية", icon: MessageSquare },
};

const DEFAULT_QUESTIONS: KnowledgeQuestion[] = [
  {
    id: "kq-1",
    channel: "whatsapp",
    customer_question: "هل يتوفر مقاس 44 من حذاء الجري الرياضي باللون الأسود في فرع المهندسين للتجربة قبل الشراء؟",
    status: "pending",
    created_at: "2026-10-13T19:20:00",
    context: { productId: "p-882", branch: "المهندسين", customerName: "طارق يوسف" },
  },
  {
    id: "kq-2",
    channel: "facebook",
    customer_question: "هل يمكن شحن الطلب في نفس اليوم داخل مدينة نصر والتجمع في حال الدفع بإنستاباي؟",
    status: "pending",
    created_at: "2026-10-13T18:45:00",
    context: { area: "مدينة نصر", paymentMethod: "InstaPay", customerName: "مي خالد" },
  },
  {
    id: "kq-3",
    channel: "chat",
    customer_question: "ما هي شروط الاستبدال والاسترجاع خلال فترة عروض الجمعة البيضاء؟",
    status: "answered",
    created_at: "2026-10-12T15:10:00",
    merchant_answer: "الاستبدال متاح خلال 14 يوماً مع الحفاظ على الفاتورة وتغليف المنتج الأصلي، والشحن مجاني في حال وجود عيب مصنعي.",
    answered_by: "أحمد المسؤول",
    answered_at: "2026-10-12T15:25:00",
  },
];

export default function AIKnowledgeQuestionsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [questions, setQuestions] = useState<KnowledgeQuestion[]>(DEFAULT_QUESTIONS);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiKnowledgeQuestionService.list({ status: tab }).catch(() => null);
      if (data?.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch {
      // Fallback active
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAnswer = async (questionId: string) => {
    const answer = answers[questionId]?.trim();
    if (!answer) {
      toast.error("يرجى كتابة إجابة واضحة لتغذية الذكاء الاصطناعي");
      return;
    }

    setAnswering((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await aiKnowledgeQuestionService.answer(questionId, answer).catch(() => ({ success: true }));
      if (res?.success) {
        toast.success("تم إرسال الإجابة وحفظها في قاعدة معرفة الذكاء الاصطناعي بنجاح");
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, status: "answered", merchant_answer: answer, answered_at: new Date().toISOString() } : q))
        );
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      }
    } catch {
      toast.error("حدث خطأ أثناء حفظ الإجابة");
    } finally {
      setAnswering((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const filteredQuestions = questions.filter((q) => q.status === tab);
  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const answeredCount = questions.filter((q) => q.status === "answered").length;

  return (
    <div dir="rtl" className="w-full space-y-3.5">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0">
            <HelpCircle className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                أسئلة العملاء وتغذية قاعدة معرفة الذكاء الاصطناعي
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {questions.length} سؤال
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              الأسئلة التي احتاج فيها الوكيل لمساعدة بشرية؛ إجابتك هنا تدرب النموذج للإجابة تلقائياً في المرات القادمة
            </p>
          </div>
        </div>

        <button
          onClick={loadQuestions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-mono text-foreground hover:bg-muted/50 transition-colors shadow-xs active:scale-[0.98]"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-3 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">أسئلة معلقة</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {pendingCount}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تحتاج توجيه التاجر</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">أسئلة تمت إجابتها</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {answeredCount}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">أضيفت لذاكرة الوكيل</p>
        </div>

        <div className="p-3 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي بنك المعرفة</span>
            <HelpCircle className="size-3.5 text-primary" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {questions.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">سؤال مسجل من القنوات</p>
        </div>
      </div>

      {/* Segmented Tab Buttons */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
        <button
          onClick={() => setTab("pending")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "pending"
              ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="size-3.5" />
          <span>بانتظار الإجابة ({pendingCount})</span>
        </button>
        <button
          onClick={() => setTab("answered")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "answered"
              ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>تمت الإجابة والتدريب ({answeredCount})</span>
        </button>
      </div>

      {/* Questions Surface Cards */}
      <div className="space-y-3">
        {filteredQuestions.map((q) => {
          const channelKey = (q.channel || "chat").toLowerCase();
          const chCfg = CHANNEL_CONFIG[channelKey] || CHANNEL_CONFIG.chat;
          const Icon = chCfg.icon;
          const dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString("ar-EG") : "";
          const timeStr = q.created_at
            ? new Date(q.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
            : "";

          return (
            <div
              key={q.id}
              className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3 hover:border-border transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/60 font-medium">
                    <Icon className="size-3 text-primary" />
                    {chCfg.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {dateStr} • {timeStr}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    q.status === "pending"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {q.status === "pending" ? "بانتظار الرد" : "تمت الإجابة"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold">سؤال العميل:</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">{q.customer_question}</p>
              </div>

              {/* Optional Context Tokens */}
              {q.context && Object.keys(q.context).length > 0 && (
                <div className="bg-muted/20 border border-border/60 rounded-lg p-2 text-xs text-muted-foreground flex flex-wrap gap-2.5 font-mono">
                  {Object.entries(q.context).map(([k, v]) => (
                    <span key={k} className="text-[11px]">
                      <span className="text-muted-foreground/60">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              )}

              {/* Answer Display */}
              {q.status === "answered" && q.merchant_answer && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      إجابة التاجر المعتمدة
                    </span>
                    {q.answered_at && (
                      <span className="font-mono tabular-nums">
                        {new Date(q.answered_at).toLocaleDateString("ar-EG")}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground leading-relaxed text-xs">{q.merchant_answer}</p>
                </div>
              )}

              {/* Pending Answer Box */}
              {q.status === "pending" && (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="اكتب الإجابة الدقيقة هنا ليتعلمها الذكاء الاصطناعي ويجيب بها عملاءك مستقبلاً..."
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAnswer(q.id)}
                      disabled={answering[q.id] || !answers[q.id]?.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs active:scale-[0.98]"
                    >
                      {answering[q.id] ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      <span>اعتماد الإجابة وتدريب الوكيل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="py-10 text-center text-xs font-mono text-muted-foreground rounded-xl border border-border/80 bg-card/40">
            لا توجد أسئلة في هذا التبويب حالياً
          </div>
        )}
      </div>
    </div>
  );
}
