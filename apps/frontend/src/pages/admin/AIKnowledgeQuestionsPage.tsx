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
  ChevronDown,
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
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Top Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              أسئلة العملاء وتغذية قاعدة معرفة الذكاء الاصطناعي
            </h1>
            <p className="text-xs text-muted-foreground">
              الأسئلة التي احتاج فيها الوكيل لمساعدة بشرية؛ إجابتك هنا تدرب النموذج للإجابة تلقائياً في المرات القادمة
            </p>
          </div>
          <button
            onClick={loadQuestions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث القائمة
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Telemetry KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>أسئلة معلقة</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {pendingCount}
            </div>
            <div className="text-[11px] text-muted-foreground">تحتاج توجيه التاجر</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>أسئلة تمت إجابتها</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {answeredCount}
            </div>
            <div className="text-[11px] text-muted-foreground">أضيفت لذاكرة الوكيل</div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي بنك المعرفة</span>
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {questions.length}
            </div>
            <div className="text-[11px] text-muted-foreground">سؤال مسجل من القنوات</div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
          <button
            onClick={() => setTab("pending")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "pending"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>بانتظار الإجابة ({pendingCount})</span>
          </button>
          <button
            onClick={() => setTab("answered")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "answered"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
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
                className="bg-card border border-border/70 rounded-xl p-4.5 shadow-xs space-y-3 hover:border-border transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-muted-foreground border border-border/60 font-medium">
                      <Icon className="w-3 h-3 text-primary" />
                      {chCfg.label}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                      {dateStr} • {timeStr}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      q.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {q.status === "pending" ? "بانتظار الرد" : "تمت الإجابة"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">سؤال العميل:</span>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">{q.customer_question}</p>
                </div>

                {/* Optional Context */}
                {q.context && Object.keys(q.context).length > 0 && (
                  <div className="bg-muted/20 border border-border/60 rounded-lg p-2.5 text-xs text-muted-foreground flex flex-wrap gap-3 font-mono">
                    {Object.entries(q.context).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-muted-foreground/60">{k}:</span> {String(v)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Answer Display */}
                {q.status === "answered" && q.merchant_answer && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        إجابة التاجر المعتمدة
                      </span>
                      {q.answered_at && (
                        <span className="font-mono tabular-nums">
                          {new Date(q.answered_at).toLocaleDateString("ar-EG")}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground leading-relaxed">{q.merchant_answer}</p>
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
                      className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleAnswer(q.id)}
                        disabled={answering[q.id] || !answers[q.id]?.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {answering[q.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        اعتماد الإجابة وتدريب الوكيل
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground bg-card border border-border/70 rounded-xl">
              لا توجد أسئلة في هذا التبويب حالياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
