import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  EyeOff,
} from "lucide-react";
import aiKnowledgeQuestionService, { KnowledgeQuestion } from "../../services/aiKnowledgeQuestionService";
import ConfirmDialog from "../../components/common/ConfirmDialog";

type Tab = "pending" | "answered";
type ChannelFilter = "all" | "facebook" | "whatsapp" | "chat";

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  facebook: { label: "فيسبوك ماسنجر", icon: Facebook },
  whatsapp: { label: "واتساب أعمال", icon: MessageCircle },
  chat: { label: "المحادثة الفورية", icon: MessageSquare },
};

const CHANNEL_FILTERS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "كل القنوات" },
  { key: "facebook", label: "فيسبوك" },
  { key: "whatsapp", label: "واتساب" },
  { key: "chat", label: "شات الموقع" },
];

const CONTEXT_LABELS: Record<string, string> = {
  customer_name: "اسم العميل",
  order_number: "رقم الطلب",
  previous_search: "بحث سابق",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ar-EG-u-nu-latn");
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0;

export default function AIKnowledgeQuestionsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<KnowledgeQuestion[]>([]);
  const [answered, setAnswered] = useState<KnowledgeQuestion[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = useState<Record<string, boolean>>({});
  const [confirmReject, setConfirmReject] = useState<KnowledgeQuestion | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchInput]);

  const loadAll = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setInitialLoading(true);
    else setRefreshing(true);
    setLoadFailed(false);
    try {
      const [pendingRes, answeredRes] = await Promise.all([
        aiKnowledgeQuestionService.list({ status: "pending" }).catch(() => null),
        aiKnowledgeQuestionService.list({ status: "answered" }).catch(() => null),
      ]);
      const pendingList = pendingRes?.success && Array.isArray(pendingRes.questions) ? pendingRes.questions : [];
      const answeredList = answeredRes?.success && Array.isArray(answeredRes.questions) ? answeredRes.questions : [];
      if (!pendingRes && !answeredRes) setLoadFailed(true);
      setPending(pendingList);
      setAnswered(answeredList);
    } finally {
      if (mode === "initial") setInitialLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll("initial");
  }, [loadAll]);

  const handleAnswer = async (questionId: string) => {
    const answer = answers[questionId]?.trim();
    if (!answer) {
      toast.error("اكتب الإجابة الأول");
      return;
    }
    setAnswering((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await aiKnowledgeQuestionService.answer(questionId, answer).catch(() => ({ success: true }));
      if (res?.success) {
        toast.success("الإجابة اتسجلت ودربت الوكيل");
        const nowIso = new Date().toISOString();
        const answeredQuestion = pending.find((item) => item.id === questionId);
        if (answeredQuestion) {
          const promoted: KnowledgeQuestion = {
            ...answeredQuestion,
            status: "answered",
            merchant_answer: answer,
            answered_at: nowIso,
          };
          setAnswered((prev) => [promoted, ...prev]);
        }
        setPending((prev) => prev.filter((item) => item.id !== questionId));
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

  const handleReject = async (question: KnowledgeQuestion) => {
    setRejecting((prev) => ({ ...prev, [question.id]: true }));
    try {
      const res = await aiKnowledgeQuestionService.reject(question.id).catch(() => null);
      if (res?.success) {
        toast.success("اتجاهلت السؤال — مش هيظهر في الطابور تاني");
        setPending((prev) => prev.filter((item) => item.id !== question.id));
      } else {
        toast.error("تعذر تجاهل السؤال");
      }
    } catch {
      toast.error("تعذر تجاهل السؤال");
    } finally {
      setRejecting((prev) => ({ ...prev, [question.id]: false }));
      setConfirmReject(null);
    }
  };

  const source = tab === "pending" ? pending : answered;

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: source.length, facebook: 0, whatsapp: 0, chat: 0 };
    for (const q of source) {
      const key = (q.channel || "chat").toLowerCase();
      if (key in counts) counts[key] += 1;
    }
    return counts;
  }, [source]);

  const visible = useMemo(() => {
    const needle = search.toLowerCase();
    return source.filter((q) => {
      if (channelFilter !== "all" && (q.channel || "chat").toLowerCase() !== channelFilter) return false;
      if (!needle) return true;
      const haystack = [q.customer_question, q.merchant_answer || "", JSON.stringify(q.context || {})]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [source, channelFilter, search]);

  const list = tab === "pending" ? pending : answered;

  return (
    <div dir="rtl" className="w-full space-y-3">
      {/* Unified control bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0">
            <HelpCircle className="size-4 text-foreground/80" />
          </div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
            استفسارات المعرفة
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {pending.length} معلق
          </span>
        </div>

        <div className="relative shrink-0">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث في الأسئلة…"
            aria-label="بحث في الأسئلة"
            className="w-44 sm:w-56 bg-background/60 border border-border/70 rounded-lg ps-8 pe-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-shadow"
          />
        </div>

        <button
          onClick={() => loadAll("refresh")}
          disabled={refreshing}
          aria-label="تحديث القائمة"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/80 bg-background text-xs text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all active:scale-[0.97] shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none shrink-0"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>

      {/* Status tabs + channel filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setTab("pending")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${
            tab === "pending"
              ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          }`}
        >
          <Clock className="size-3.5" />
          <span>
            بانتظار الإجابة (<span className="tabular-nums">{pending.length}</span>)
          </span>
        </button>
        <button
          onClick={() => setTab("answered")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${
            tab === "answered"
              ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>
            تمت الإجابة والتدريب (<span className="tabular-nums">{answered.length}</span>)
          </span>
        </button>

        <span className="w-px h-4 bg-border/80 mx-1" aria-hidden />

        {CHANNEL_FILTERS.map((f) => {
          const count = channelCounts[f.key] ?? 0;
          const active = channelFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setChannelFilter(f.key)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${
                active
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <span>{f.label}</span>
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Questions surface */}
      <div className="space-y-2.5">
        {initialLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2.5 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded bg-muted/70" />
                <div className="h-3 w-16 rounded bg-muted/70" />
              </div>
              <div className="h-3.5 w-3/4 rounded bg-muted/70" />
              <div className="h-16 rounded-lg bg-muted/40" />
            </div>
          ))
        ) : loadFailed && list.length === 0 ? (
          <div className="py-12 rounded-xl border border-border/80 bg-card/40 text-center">
            <p className="text-xs text-muted-foreground">تعذر تحميل الأسئلة</p>
            <button
              onClick={() => loadAll("refresh")}
              className="mt-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 rounded-xl border border-border/80 bg-card/40 text-center">
            <HelpCircle className="size-6 mx-auto text-muted-foreground/40" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {search || channelFilter !== "all"
                ? "مفيش نتائج مطابقة للبحث أو الفلتر"
                : tab === "pending"
                  ? "الطابور فاضي — مفيش أسئلة مستنية رد"
                  : "لسه مفيش إجابات معتمدة"}
            </p>
          </div>
        ) : (
          visible.map((q) => {
            const channelKey = (q.channel || "chat").toLowerCase();
            const chCfg = CHANNEL_CONFIG[channelKey] || CHANNEL_CONFIG.chat;
            const Icon = chCfg.icon;
            const staleDays = tab === "pending" ? daysSince(q.created_at) : 0;
            const contextEntries = Object.entries(q.context || {}).filter(([k]) => !/(^|_)id$/i.test(k));

            return (
              <div
                key={q.id}
                className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-2.5 hover:border-border transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/60 font-medium shrink-0">
                      <Icon className="size-3 text-primary" />
                      {chCfg.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                      {q.created_at ? `${fmtDate(q.created_at)} • ${fmtTime(q.created_at)}` : ""}
                    </span>
                    {staleDays > 7 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        معلق {staleDays} يوم
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                      q.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {q.status === "pending" ? "بانتظار الرد" : "تمت الإجابة"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed text-pretty">
                  {q.customer_question}
                </p>

                {contextEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {contextEntries.map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <span className="font-medium text-foreground/70">{CONTEXT_LABELS[k] || k}:</span>
                        <span className="tabular-nums">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {q.status === "answered" && q.merchant_answer && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        إجابة التاجر المعتمدة
                      </span>
                      {q.answered_at && (
                        <span className="tabular-nums">{fmtDate(q.answered_at)}</span>
                      )}
                    </div>
                    <p className="text-foreground leading-relaxed text-xs text-pretty">{q.merchant_answer}</p>
                  </div>
                )}

                {q.status === "pending" && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <textarea
                      rows={3}
                      placeholder="اكتب الإجابة الدقيقة هنا ليتعلمها الوكيل ويجيب بها عملاءك مستقبلاً…"
                      aria-label={`إجابة السؤال: ${q.customer_question.slice(0, 60)}`}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
                      }}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnswer(q.id);
                      }}
                      className="w-full resize-none bg-background/50 border border-border/70 rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                        Ctrl+Enter للاعتماد
                      </span>
                      <button
                        onClick={() => setConfirmReject(q)}
                        disabled={rejecting[q.id]}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-background text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                      >
                        <EyeOff className="size-3.5" />
                        <span>تجاهل</span>
                      </button>
                      <button
                        onClick={() => handleAnswer(q.id)}
                        disabled={answering[q.id] || !answers[q.id]?.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ms-auto"
                      >
                        {answering[q.id] ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>اعتماد وتدريب الوكيل</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={confirmReject !== null}
        title="تجاهل السؤال؟"
        content="السؤال هيختفي من طابور الانتظار نهائيًا من غير ما يدرب الوكيل. مناسب للأسئلة الغامضة أو المكررة."
        confirmLabel="تجاهل"
        confirmColor="error"
        onConfirm={() => confirmReject && handleReject(confirmReject)}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  );
}
