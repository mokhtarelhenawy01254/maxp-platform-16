import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListChecks,
  Phone,
  MessageCircle,
  CalendarClock,
  RefreshCcw,
  UserCheck,
  Eye,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import {
  customerService,
  DueFollowUpLead,
} from "../../services/customerService";

type BucketKey = "overdue" | "today" | "upcoming";

const BUCKETS: { key: BucketKey; label: string; empty: string }[] = [
  { key: "overdue", label: "متأخرة", empty: "مفيش متابعات متأخرة — تمام كده" },
  { key: "today", label: "النهارده", empty: "مفيش متابعات مستحقة النهارده" },
  { key: "upcoming", label: "قادمة", empty: "مفيش متابعات قادمة خلال الأسبوع ده" },
];

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "جديد",
  CONTACTED: "تم التواصل",
  INTERESTED: "مهتم",
  FOLLOW_UP_SCHEDULED: "متابعة مجدولة",
  PROPOSAL_SENT: "عرض مُرسل",
  NEGOTIATION: "تفاوض",
  CONVERTED: "اتحول",
  NOT_INTERESTED: "غير مهتم",
  LOST: "مفقود",
};

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

const dtf = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const waDigits = (phone?: string | null) => (phone || "").replace(/\D/g, "");

const LeadsFollowUps: React.FC = () => {
  const navigate = useNavigate();
  const [bucket, setBucket] = useState<BucketKey>("overdue");
  const [mine, setMine] = useState(false);
  const [leads, setLeads] = useState<DueFollowUpLead[]>([]);
  const [counts, setCounts] = useState({ overdue: 0, today: 0, upcoming: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [postponingId, setPostponingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const loadBucket = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await customerService.getDueFollowUps(bucket, mine);
      setLeads(res.leads || []);
      setCounts(
        res.counts || { overdue: 0, today: 0, upcoming: 0 },
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "فشل تحميل المتابعات");
    } finally {
      setIsLoading(false);
    }
  }, [bucket, mine]);

  useEffect(() => {
    loadBucket();
  }, [loadBucket]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handlePostpone = async (lead: DueFollowUpLead) => {
    setPostponingId(lead.id);
    try {
      await customerService.updateCustomer(lead.id, {
        nextFollowUpDate: new Date(Date.now() + 86400000).toISOString(),
      });
      showToast(
        `تم تأجيل متابعة ${`${lead.firstName || ""} ${lead.lastName || ""}`.trim()} ليوم واحد`,
      );
      await loadBucket();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "فشل تأجيل المتابعة",
      );
    } finally {
      setPostponingId(null);
    }
  };

  const activeEmpty = BUCKETS.find((b) => b.key === bucket)?.empty || "";

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ListChecks className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              متابعات الليدز
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            الليدز اللي محتاجة متابعة النهارده واللي فات وقتها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMine((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] ${
              mine
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card text-muted-foreground border-border/70 hover:bg-muted/30"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>ليداتي فقط</span>
          </button>
          <button
            type="button"
            onClick={loadBucket}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-muted/30 transition-all shadow-2xs active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Bucket chips with counts */}
      <div className="flex items-center gap-2 flex-wrap">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBucket(b.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] ${
              bucket === b.key
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-card text-muted-foreground border-border/70 hover:bg-muted/30"
            }`}
          >
            <span>{b.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${bucket === b.key ? "bg-primary-foreground/20" : "bg-muted/50"}`}>
              {counts[b.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl px-4 py-3 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={loadBucket}
            className="px-3 py-1 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-all active:scale-[0.97]"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/70 bg-card shadow-2xs p-4 space-y-3 animate-pulse"
            >
              <div className="h-4 w-1/3 rounded bg-muted/60" />
              <div className="h-3 w-1/4 rounded bg-muted/40" />
              <div className="h-8 w-full rounded-xl bg-muted/30" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        /* Empty state per bucket */
        <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">{activeEmpty}</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            جدول المتابعات فاضي في السلة دي. جرّب سلة تانية أو حدّث القائمة.
          </p>
        </div>
      ) : (
        /* Card list */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {leads.map((lead) => {
            const fullName =
              `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "عميل غير مسمى";
            const stage = lead.leadStage ? STAGE_LABELS[lead.leadStage] : null;
            const priority = lead.leadPriority ? PRIORITY_STYLES[lead.leadPriority] : null;
            const assignee = lead.assignedTo
              ? `${lead.assignedTo.firstName || ""} ${lead.assignedTo.lastName || ""}`.trim()
              : null;
            const digits = waDigits(lead.phone);

            return (
              <div
                key={lead.id}
                className="rounded-2xl border border-border/70 bg-card shadow-2xs p-4 flex flex-col gap-3 min-w-0"
              >
                {/* Name + priority */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {fullName}
                    </div>
                    {lead.phone && (
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums mt-0.5" dir="ltr">
                        {lead.phone}
                      </div>
                    )}
                  </div>
                  {priority && (
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${priority.cls}`}>
                      {priority.label}
                    </span>
                  )}
                </div>

                {/* Chips: stage + assignee */}
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {stage && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {stage}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted/40 text-muted-foreground border border-border/60 min-w-0">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[10rem]">{assignee || "غير مُسند"}</span>
                  </span>
                </div>

                {/* Next follow-up */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>المتابعة القادمة:</span>
                  <span dir="ltr" className="tabular-nums font-mono text-foreground">
                    {lead.nextFollowUpDate ? dtf.format(new Date(lead.nextFollowUpDate)) : "—"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                  {lead.phone && (
                    <>
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="اتصال هاتفي"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"
                        title="واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePostpone(lead)}
                    disabled={postponingId === lead.id}
                    className="mr-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border/70 text-foreground hover:bg-muted/30 transition-all shadow-2xs active:scale-[0.97] disabled:opacity-50"
                  >
                    <Clock className={`h-3.5 w-3.5 ${postponingId === lead.id ? "animate-spin" : ""}`} />
                    <span>تأجيل يوم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${lead.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs active:scale-[0.97]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>فتح الليد</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline success toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default LeadsFollowUps;
