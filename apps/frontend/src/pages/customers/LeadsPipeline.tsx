import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Columns3,
  Phone,
  MessageCircle,
  Clock,
  User,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import {
  customerService,
  Customer,
  type LeadAnalytics,
} from "../../services/customerService";

type StageKey =
  | "NEW_LEAD"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW_UP_SCHEDULED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "CONVERTED"
  | "NOT_INTERESTED"
  | "LOST";

type PriorityFilter = "ALL" | "HOT" | "WARM" | "COLD";

const STAGES: {
  key: StageKey;
  label: string;
  border: string;
  muted?: boolean;
}[] = [
  { key: "NEW_LEAD", label: "جديد", border: "border-t-blue-500" },
  { key: "CONTACTED", label: "تم التواصل", border: "border-t-sky-500" },
  { key: "INTERESTED", label: "مهتم", border: "border-t-indigo-500" },
  {
    key: "FOLLOW_UP_SCHEDULED",
    label: "متابعة مجدولة",
    border: "border-t-violet-500",
  },
  { key: "PROPOSAL_SENT", label: "عرض مُرسل", border: "border-t-amber-500" },
  { key: "NEGOTIATION", label: "تفاوض", border: "border-t-orange-500" },
  { key: "CONVERTED", label: "اتحول", border: "border-t-emerald-500", muted: true },
  {
    key: "NOT_INTERESTED",
    label: "غير مهتم",
    border: "border-t-slate-400",
    muted: true,
  },
  { key: "LOST", label: "مفقود", border: "border-t-rose-500", muted: true },
];

const STAGE_KEYS = new Set(STAGES.map((s) => s.key));

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  HOT: {
    label: "ساخن",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  WARM: {
    label: "دافئ",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  COLD: {
    label: "بارد",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
  },
};

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: "ALL", label: "الكل" },
  { key: "HOT", label: "ساخن" },
  { key: "WARM", label: "دافئ" },
  { key: "COLD", label: "بارد" },
];

const dateFmt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short" });
const waDigits = (phone?: string | null) => (phone || "").replace(/\D/g, "");

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "واتساب",
  FACEBOOK: "فيسبوك",
  INSTAGRAM: "انستجرام",
  TIKTOK: "تيك توك",
  CALL: "اتصال",
  WEBSITE: "موقع",
  REFERRAL: "توصية",
  WALK_IN: "زيارة",
  OTHER: "أخرى",
};

const LeadsPipeline: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOverStage, setDragOverStage] = useState<StageKey | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const draggingRef = useRef<Customer | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    customerService
      .getLeadAnalytics()
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        // non-blocking: strip stays hidden on error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await customerService.getCustomers({
        status: "LEAD",
        hasOrders: false,
        limit: 300,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
      setCustomers(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "فشل تحميل لوحة الليدز");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const filtered =
    priorityFilter === "ALL"
      ? customers
      : customers.filter((c) => c.leadPriority === priorityFilter);

  const stageOf = (c: Customer): StageKey =>
    c.leadStage && STAGE_KEYS.has(c.leadStage) ? (c.leadStage as StageKey) : "NEW_LEAD";

  const handleDrop = async (stage: StageKey) => {
    const lead = draggingRef.current;
    setDragOverStage(null);
    draggingRef.current = null;
    if (!lead || stageOf(lead) === stage) return;

    const previous = customers;
    // Optimistic move
    setCustomers((prev) =>
      prev.map((c) => (c.id === lead.id ? { ...c, leadStage: stage } : c)),
    );
    try {
      await customerService.updateCustomer(lead.id, { leadStage: stage });
    } catch (err: any) {
      setCustomers(previous); // revert
      setError(
        err.response?.data?.message || err.message || "فشل نقل الليد بين المراحل",
      );
      setTimeout(() => setError(""), 5000);
    }
  };

  const renderCard = (c: Customer) => {
    const fullName =
      `${c.firstName || ""} ${c.lastName || ""}`.trim() || "عميل غير مسمى";
    const priority = c.leadPriority ? PRIORITY_STYLES[c.leadPriority] : null;
    const digits = waDigits(c.phone);
    const assignee = c.assignedTo
      ? `${c.assignedTo.firstName || ""} ${c.assignedTo.lastName || ""}`.trim()
      : null;

    return (
      <div
        key={c.id}
        draggable
        onDragStart={() => {
          draggingRef.current = c;
          didDragRef.current = true;
        }}
        onDragEnd={() => {
          draggingRef.current = null;
          setTimeout(() => {
            didDragRef.current = false;
          }, 100);
        }}
        onClick={() => {
          if (didDragRef.current) return;
          navigate(`/customers/${c.id}`);
        }}
        className={`rounded-xl border border-border/70 bg-card shadow-2xs p-2.5 space-y-1.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all min-w-0 ${
          dragOverStage ? "opacity-90" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <div className="font-semibold text-xs text-foreground truncate min-w-0">
            {fullName}
          </div>
          {priority && (
            <span
              className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${priority.cls}`}
            >
              {priority.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate min-w-0">{assignee || "غير مُسند"}</span>
        </div>
        {c.nextFollowUpDate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span dir="ltr" className="tabular-nums">
              {dateFmt.format(new Date(c.nextFollowUpDate))}
            </span>
          </div>
        )}
        {c.phone && (
          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
            <a
              href={`tel:${c.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="اتصال هاتفي"
            >
              <Phone className="w-3 h-3" />
            </a>
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"
              title="واتساب"
            >
              <MessageCircle className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Columns3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              كانبان الليدز
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 tabular-nums">
              إجمالي {filtered.length} ليد
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            اسحب الكارت وحطه في المرحلة الجديدة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPriorityFilter(p.key)}
              className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] ${
                priorityFilter === p.key
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-card text-muted-foreground border-border/70 hover:bg-muted/30"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={loadBoard}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-muted/30 transition-all shadow-2xs active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Analytics strip (hidden on fetch error) */}
      {analytics && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted/40 text-muted-foreground border border-border/70 tabular-nums whitespace-nowrap">
            إجمالي {analytics.totalLeads} ليد
          </span>
          {Object.entries(analytics.bySource || {})
            .filter(([, count]) => count > 0)
            .map(([source, count]) => (
              <span
                key={source}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card text-muted-foreground border border-border/70 tabular-nums whitespace-nowrap"
              >
                {SOURCE_LABELS[source] || source}
                <span className="font-semibold text-foreground">{count}</span>
              </span>
            ))}
          <span
            className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border tabular-nums whitespace-nowrap ${
              analytics.conversionRate > 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted/40 text-muted-foreground border-border/70"
            }`}
          >
            معدل التحويل {analytics.conversionRate}%
          </span>
          {analytics.avgFirstResponseHours !== null && (
            <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-card text-muted-foreground border border-border/70 tabular-nums whitespace-nowrap">
              متوسط أول رد: {analytics.avgFirstResponseHours} ساعة
            </span>
          )}
        </div>
      )}

      {/* Inline error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl px-4 py-2.5 text-xs font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {STAGES.slice(0, 5).map((s) => (
            <div
              key={s.key}
              className="w-60 shrink-0 rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-2 animate-pulse"
            >
              <div className="h-4 w-1/2 rounded bg-muted/60" />
              <div className="h-16 w-full rounded-xl bg-muted/30" />
              <div className="h-16 w-full rounded-xl bg-muted/30" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {STAGES.map((stage) => {
            const stageLeads = filtered.filter((c) => stageOf(c) === stage.key);
            const isDragOver = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.key);
                }}
                onDragLeave={() =>
                  setDragOverStage((cur) => (cur === stage.key ? null : cur))
                }
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(stage.key);
                }}
                className={`w-60 shrink-0 rounded-2xl border border-t-2 border-border/70 bg-card shadow-2xs flex flex-col ${
                  stage.border
                } ${stage.muted ? "opacity-70" : ""} ${
                  isDragOver
                    ? "ring-2 ring-primary/50 bg-primary/5"
                    : ""
                } transition-all`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/50">
                  <span className="text-xs font-bold text-foreground truncate">
                    {stage.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted/50 text-muted-foreground tabular-nums">
                    {stageLeads.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 min-h-24 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="text-center text-[11px] text-muted-foreground py-4">
                      فاضي
                    </div>
                  ) : (
                    stageLeads.map(renderCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeadsPipeline;
