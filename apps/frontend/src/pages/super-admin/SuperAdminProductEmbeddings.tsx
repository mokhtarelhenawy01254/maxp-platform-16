import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  Database, RefreshCw, Play, CheckCircle, AlertCircle, Clock, Layers,
  Building2, ChevronDown, ChevronRight, Info, BookOpen, Search, Sparkles
} from "lucide-react";
import { cn } from "../../lib/utils";

interface JobState {
  status: "idle" | "running" | "done" | "error";
  started_at: number | null;
  finished_at: number | null;
  total: number;
  done: number;
  errors: number;
  company_id: string | null;
  last_error: string | null;
  last_db_update: string | null;
}

interface CompanyStat {
  company_id: string;
  total: number;
  embedded: number;
  missing: number;
}

interface MissingProduct {
  id: string;
  name: string;
  sku: string;
  company_id: string;
}

interface StatusData {
  job: JobState;
  summary: { total_products: number; total_embedded: number; total_missing: number };
  companies: CompanyStat[];
  missing_products: MissingProduct[];
}

interface KnowledgeCompanyStat {
  company_id: string;
  total_faqs: number;
  total_policies: number;
  embedded_faqs: number;
  embedded_policies: number;
  missing_faqs: number;
  missing_policies: number;
}

interface KnowledgeStatusData {
  job: JobState;
  summary: {
    total_faqs: number;
    total_policies: number;
    embedded_faqs: number;
    embedded_policies: number;
    missing_faqs: number;
    missing_policies: number;
  };
  companies: KnowledgeCompanyStat[];
}

function fmtTs(ts: number | null, iso?: string | null): string {
  const d = ts ? new Date(ts * 1000) : iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(start: number | null, end: number | null): string {
  if (!start || !end) return "";
  const secs = Math.round(end - start);
  if (secs < 60) return `${secs}ث`;
  return `${Math.floor(secs / 60)}د ${secs % 60}ث`;
}

function nextScheduledTime(hour: number, minute: number): string {
  const now = new Date();
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const next = new Date(cairo);
  next.setHours(hour, minute, 0, 0);
  if (next <= cairo) next.setDate(next.getDate() + 1);
  return next.toLocaleString("ar-EG", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG = {
  idle:    { label: "في الانتظار",  color: "bg-muted text-muted-foreground border-border/60", icon: <Clock className="size-3" /> },
  running: { label: "جارٍ الآن",   color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20", icon: <RefreshCw className="size-3 animate-spin" /> },
  done:    { label: "اكتمل",        color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", icon: <CheckCircle className="size-3" /> },
  error:   { label: "خطأ",          color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20", icon: <AlertCircle className="size-3" /> },
};

function JobCard({
  job,
  scheduleHour,
  scheduleMinute,
}: {
  job: JobState | undefined;
  scheduleHour: number;
  scheduleMinute: number;
}) {
  const statusCfg = STATUS_CONFIG[job?.status ?? "idle"];
  const isRunning = job?.status === "running";
  const lastRunDisplay = fmtTs(job?.started_at ?? null, null);

  const lastRunFallback = !job?.started_at && job?.last_db_update
    ? `آخر تحديث: ${fmtTs(null, job.last_db_update)}`
    : null;

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-3.5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">حالة المهمة المجدولة</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium border", statusCfg.color)}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
          <p className="text-[10px] font-mono text-muted-foreground mb-0.5">الحالة</p>
          <p className="font-semibold text-foreground text-xs">{statusCfg.label}</p>
        </div>
        <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
          <p className="text-[10px] font-mono text-muted-foreground mb-0.5">آخر تشغيل</p>
          <p className="font-mono text-xs text-foreground truncate">{lastRunFallback || lastRunDisplay}</p>
        </div>
        <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
          <p className="text-[10px] font-mono text-muted-foreground mb-0.5">انتهى في</p>
          <p className="font-mono text-xs text-foreground truncate">
            {fmtTs(job?.finished_at ?? null, null)}
            {job?.started_at && job?.finished_at ? (
              <span className="text-muted-foreground mr-1 text-[10px]">
                ({fmtDuration(job.started_at, job.finished_at)})
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg bg-muted/20 border border-border/50 p-2">
          <p className="text-[10px] font-mono text-muted-foreground mb-0.5">التالي المجدول</p>
          <p className="font-mono text-xs text-foreground truncate">{nextScheduledTime(scheduleHour, scheduleMinute)}</p>
        </div>
      </div>

      {isRunning && job && job.total > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>تم: {job.done} / {job.total}</span>
            <span>أخطاء: {job.errors}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${Math.round((job.done / job.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {job?.last_error && (
        <p className="text-[11px] font-mono text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded p-2">
          آخر خطأ: {job.last_error}
        </p>
      )}
    </div>
  );
}

const SuperAdminProductEmbeddings: React.FC = () => {
  const [data, setData] = useState<StatusData | null>(null);
  const [kData, setKData] = useState<KnowledgeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [kSyncing, setKSyncing] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get("/super-admin/ai/product-embeddings/status");
      if (res?.success) setData(res.data);
      else setError("فشل تحميل البيانات");
    } catch {
      setError("تعذر الاتصال بالخدمة");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadKnowledge = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get("/super-admin/ai/knowledge-embeddings/status");
      if (res?.success) setKData(res.data);
    } catch { /* silent */ }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get("/admin/companies");
      if (res?.success && Array.isArray(res.data?.companies)) {
        const map: Record<string, string> = {};
        for (const c of res.data.companies) {
          if (c.id && c.name) map[c.id] = c.name;
        }
        setCompanyMap(map);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([load(), loadKnowledge(), loadCompanies()]);
  }, [load, loadKnowledge, loadCompanies]);

  // Poll product embeddings
  useEffect(() => {
    const isRunning = data?.job?.status === "running";
    if (isRunning && !pollRef.current) {
      pollRef.current = setInterval(load, 4000);
    } else if (!isRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      setSyncing(null);
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [data?.job?.status, load]);

  // Poll knowledge embeddings
  useEffect(() => {
    const isRunning = kData?.job?.status === "running";
    if (isRunning && !kPollRef.current) {
      kPollRef.current = setInterval(loadKnowledge, 4000);
    } else if (!isRunning && kPollRef.current) {
      clearInterval(kPollRef.current);
      kPollRef.current = null;
      setKSyncing(false);
    }
    return () => { if (kPollRef.current) { clearInterval(kPollRef.current); kPollRef.current = null; } };
  }, [kData?.job?.status, loadKnowledge]);

  const triggerSync = async (companyId?: string) => {
    if (data?.job?.status === "running") return;
    const key = companyId || "all";
    setSyncing(key);
    try {
      await apiClient.post("/super-admin/ai/product-embeddings/sync", { company_id: companyId || null });
      pollRef.current = setInterval(load, 4000);
      await load();
    } catch {
      setSyncing(null);
      setError("فشل تشغيل المزامنة");
    }
  };

  const triggerKnowledgeSync = async (companyId?: string) => {
    if (kData?.job?.status === "running") return;
    setKSyncing(true);
    try {
      await apiClient.post("/super-admin/ai/knowledge-embeddings/sync", { company_id: companyId || null });
      kPollRef.current = setInterval(loadKnowledge, 4000);
      await loadKnowledge();
    } catch {
      setKSyncing(false);
    }
  };

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isRunning = data?.job?.status === "running";
  const kIsRunning = kData?.job?.status === "running";

  if (loading) return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 flex justify-center items-center h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  );

  const job = data?.job;
  const summary = data?.summary;
  const companies = data?.companies ?? [];
  const missingProducts = data?.missing_products ?? [];

  const kJob = kData?.job;
  const kSummary = kData?.summary;
  const kCompanies = kData?.companies ?? [];

  const missingByCompany: Record<string, MissingProduct[]> = {};
  for (const p of missingProducts) {
    if (!missingByCompany[p.company_id]) missingByCompany[p.company_id] = [];
    missingByCompany[p.company_id].push(p);
  }

  const filteredCompanies = companies.filter(c => {
    if (!productSearch.trim()) return true;
    const q = productSearch.trim().toLowerCase();
    return (companyMap[c.company_id] || "").toLowerCase().includes(q) || c.company_id.toLowerCase().includes(q);
  });

  const filteredKCompanies = kCompanies.filter(c => {
    if (!knowledgeSearch.trim()) return true;
    const q = knowledgeSearch.trim().toLowerCase();
    return (companyMap[c.company_id] || "").toLowerCase().includes(q) || c.company_id.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Linear Single-Surface Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Database className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                مزامنة التضمينات الدلالية بالذكاء الاصطناعي
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className={cn("size-1.5 rounded-full", isRunning || kIsRunning ? "bg-blue-500 animate-spin" : "bg-emerald-500")} />
                {isRunning || kIsRunning ? "مزامنة جارية" : "جاهز"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تضمينات المنتجات والمعرفة للبحث الدلالي اللحظي وقواعد المعرفة الخاصة بالشركات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => Promise.all([load(), loadKnowledge()])}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Ribbon for Product Embeddings */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي المنتجات</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {summary.total_products.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">في جميع الكتالوجات</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">منتجات مُضَمَّنة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {summary.total_embedded.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">جاهزة للبحث البصري والذكي</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">منتجات مفقودة التضمين</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className={cn("text-2xl font-bold tracking-tight font-mono tabular-nums", summary.total_missing > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              {summary.total_missing.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تتطلب مزامنة لتحديثها</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نسبة اكتمال التضمينات</span>
              <span className="size-1.5 rounded-full bg-purple-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {summary.total_products > 0
                ? `${Math.round((summary.total_embedded / summary.total_products) * 100)}%`
                : "100%"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">معدل التغطية الفعلي</p>
          </div>
        </div>
      )}

      {/* Section 1: Product Embeddings */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground">تضمينات المنتجات والكتالوج</h2>
          </div>
          <Button
            size="sm"
            onClick={() => triggerSync()}
            disabled={isRunning || syncing !== null}
            className="h-7 text-xs font-mono gap-1.5 active:scale-[0.98]"
          >
            {isRunning ? (
              <>
                <RefreshCw className="size-3 animate-spin" />
                <span>جارٍ المزامنة...</span>
              </>
            ) : (
              <>
                <Play className="size-3" />
                <span>مزامنة كافة المنتجات</span>
              </>
            )}
          </Button>
        </div>

        <JobCard job={job} scheduleHour={3} scheduleMinute={0} />

        {/* Company breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث باسم الشركة أو المعرف..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full h-7 rounded-md border border-border/80 bg-background/50 pr-7 pl-3 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredCompanies.length} / {companies.length} شركة
            </Badge>
          </div>

          <div className="rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden bg-background/30 text-xs">
            {filteredCompanies.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                لا توجد شركات مطابقة
              </div>
            ) : (
              filteredCompanies.map(c => {
                const pct = c.total > 0 ? Math.round((c.embedded / c.total) * 100) : 100;
                const isExpanded = expandedCompanies.has(c.company_id);
                const companyMissing = missingByCompany[c.company_id] ?? [];
                const name = companyMap[c.company_id];
                return (
                  <div key={c.company_id}>
                    <div className="p-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                      <button
                        onClick={() => toggleCompany(c.company_id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        disabled={c.missing === 0}
                      >
                        {c.missing > 0
                          ? (isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)
                          : <CheckCircle className="size-3.5 text-emerald-500" />
                        }
                      </button>
                      <div className="w-48 shrink-0">
                        {name ? (
                          <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                        ) : (
                          <code className="text-[10px] text-muted-foreground font-mono truncate block">{c.company_id}</code>
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{c.embedded}/{c.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all rounded-full", pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : "bg-amber-500")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {c.missing > 0 && (
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 shrink-0">
                          {c.missing} ناقص
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={c.missing > 0 ? "default" : "outline"}
                        className="shrink-0 h-6 text-[10px] font-mono gap-1 px-2 active:scale-[0.98]"
                        disabled={isRunning || syncing !== null}
                        onClick={() => triggerSync(c.company_id)}
                      >
                        <Play className="size-2.5" />
                        <span>مزامنة</span>
                      </Button>
                    </div>
                    {isExpanded && companyMissing.length > 0 && (
                      <div className="bg-amber-500/5 border-t border-amber-500/20 px-8 py-2 space-y-1">
                        <p className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                          <Info className="size-3" />
                          المنتجات غير المُضَمَّنة ({companyMissing.length})
                        </p>
                        {companyMissing.slice(0, 10).map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-xs py-0.5 font-mono">
                            <span className="text-foreground font-medium">{p.name}</span>
                            {p.sku && <code className="text-muted-foreground text-[10px]">{p.sku}</code>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Knowledge Embeddings */}
      <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-purple-600" />
            <h2 className="text-xs font-semibold text-foreground">تضمينات المعرفة والسياسات (Knowledge Embeddings)</h2>
          </div>
          <Button
            size="sm"
            onClick={() => triggerKnowledgeSync()}
            disabled={kIsRunning || kSyncing}
            className="h-7 text-xs font-mono gap-1.5 active:scale-[0.98]"
          >
            {kIsRunning ? (
              <>
                <RefreshCw className="size-3 animate-spin" />
                <span>جارٍ المزامنة...</span>
              </>
            ) : (
              <>
                <Play className="size-3" />
                <span>مزامنة المعرفة</span>
              </>
            )}
          </Button>
        </div>

        <JobCard job={kJob} scheduleHour={3} scheduleMinute={30} />

        {kSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <p className="text-lg font-bold font-mono tabular-nums text-foreground">{kSummary.total_faqs.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">إجمالي الأسئلة</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{kSummary.embedded_faqs.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">أسئلة مُضَمَّنة</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <p className="text-lg font-bold font-mono tabular-nums text-foreground">{kSummary.total_policies.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">إجمالي السياسات</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{kSummary.embedded_policies.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">سياسات مُضَمَّنة</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الـ ID..."
                value={knowledgeSearch}
                onChange={e => setKnowledgeSearch(e.target.value)}
                className="w-full h-7 rounded-md border border-border/80 bg-background/50 pr-7 pl-3 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredKCompanies.length} / {kCompanies.length} شركة
            </Badge>
          </div>

          <div className="rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden bg-background/30 text-xs">
            {filteredKCompanies.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                لا توجد بيانات للمعرفة
              </div>
            ) : (
              filteredKCompanies.map(c => {
                const totalK = c.total_faqs + c.total_policies;
                const embeddedK = c.embedded_faqs + c.embedded_policies;
                const missingK = c.missing_faqs + c.missing_policies;
                const pct = totalK > 0 ? Math.round((embeddedK / totalK) * 100) : 100;
                const name = companyMap[c.company_id];
                return (
                  <div key={c.company_id} className="p-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                    <div className="text-muted-foreground">
                      {missingK === 0
                        ? <CheckCircle className="size-3.5 text-emerald-500" />
                        : <AlertCircle className="size-3.5 text-amber-500" />
                      }
                    </div>
                    <div className="w-48 shrink-0">
                      {name ? (
                        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                      ) : (
                        <code className="text-[10px] text-muted-foreground font-mono truncate block">{c.company_id}</code>
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>
                          أسئلة: {c.embedded_faqs}/{c.total_faqs} | سياسات: {c.embedded_policies}/{c.total_policies}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full transition-all rounded-full", pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-purple-500" : "bg-amber-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {missingK > 0 && (
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 shrink-0">
                        {missingK} ناقص
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={missingK > 0 ? "default" : "outline"}
                      className="shrink-0 h-6 text-[10px] font-mono gap-1 px-2 active:scale-[0.98]"
                      disabled={kIsRunning || kSyncing}
                      onClick={() => triggerKnowledgeSync(c.company_id)}
                    >
                      <Play className="size-2.5" />
                      <span>مزامنة</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProductEmbeddings;
