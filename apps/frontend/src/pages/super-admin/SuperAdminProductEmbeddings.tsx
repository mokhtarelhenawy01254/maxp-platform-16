import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import { AlertCircle, AlertTriangle, Book, BookOpen, Building, Building2, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Database, Grid, Info, Layers, Play, RefreshCw, Search, Server } from 'lucide-react';

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
  idle:    { label: "في الانتظار",  color: "bg-slate-100 text-slate-700", icon: <Clock className="size-3" /> },
  running: { label: "جارٍ الآن",   color: "bg-blue-100 text-blue-700",   icon: <RefreshCw className="size-3 animate-spin" /> },
  done:    { label: "اكتمل",        color: "bg-green-100 text-green-700", icon: <CheckCircle className="size-3" /> },
  error:   { label: "خطأ",          color: "bg-red-100 text-red-700",     icon: <AlertCircle className="size-3" /> },
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
  const finishedDisplay = job?.started_at && job?.finished_at
    ? fmtTs(null, null).replace("—", "") + fmtTs(job.finished_at, null)
    : fmtTs(job?.finished_at ?? null, null);

  const lastRunFallback = !job?.started_at && job?.last_db_update
    ? `آخر تحديث: ${fmtTs(null, job.last_db_update)}`
    : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">حالة المهمة المجدولة</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">الحالة</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">آخر تشغيل</p>
          {lastRunFallback ? (
            <p className="text-xs font-medium text-muted-foreground">{lastRunFallback}</p>
          ) : (
            <p className="text-xs font-medium">{lastRunDisplay}</p>
          )}
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">انتهى في</p>
          <p className="text-xs font-medium">
            {fmtTs(job?.finished_at ?? null, null)}
            {job?.started_at && job?.finished_at ? (
              <span className="text-muted-foreground mr-1">
                ({fmtDuration(job.started_at, job.finished_at)})
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">التالي المجدول</p>
          <p className="text-xs font-medium">{nextScheduledTime(scheduleHour, scheduleMinute)}</p>
        </div>
      </div>

      {isRunning && job && job.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>تم: {job.done} / {job.total}</span>
            <span>أخطاء: {job.errors}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.round((job.done / job.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {job?.last_error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">
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

  const companyName = (id: string) => companyMap[id] || id;

  const isRunning = data?.job?.status === "running";
  const kIsRunning = kData?.job?.status === "running";

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
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
    <div className="flex flex-col h-[calc(100dvh-64px)]" dir={i18n.dir()}>
      {/* Header */}
      <div className="px-4 py-3 shrink-0 border-b bg-card flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50">
          <Database className="size-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">مزامنة التضمينات الدلالية</p>
          <p className="text-xs text-muted-foreground">
            تضمينات المنتجات والمعرفة (الأسئلة الشائعة والسياسات) للبحث الذكي
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => Promise.all([load(), loadKnowledge()])} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── PRODUCT EMBEDDINGS ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-blue-600" />
              <h2 className="text-sm font-bold">تضمينات المنتجات</h2>
            </div>
            <Button
              size="sm"
              onClick={() => triggerSync()}
              disabled={isRunning || syncing !== null}
              className="gap-1.5"
            >
              {isRunning
                ? <><RefreshCw className="size-3.5 animate-spin" /> جارٍ المزامنة...</>
                : <><Play className="size-3.5" /> مزامنة الكل</>
              }
            </Button>
          </div>

          <JobCard job={job} scheduleHour={3} scheduleMinute={0} />

          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold">{summary.total_products.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي المنتجات</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.total_embedded.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">مُضَمَّنة</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className={`text-2xl font-bold ${summary.total_missing > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {summary.total_missing.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">غير مُضَمَّنة</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">تفاصيل الشركات</span>
                <Badge variant="secondary" className="mr-auto text-xs">{filteredCompanies.length} / {companies.length} شركة</Badge>
              </div>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الـ ID..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full rounded-lg border bg-background pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {filteredCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Layers className="size-8 opacity-40" />
                <p className="text-sm">{companies.length === 0 ? "لا توجد بيانات" : "لا توجد نتائج للبحث"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredCompanies.map(c => {
                  const pct = c.total > 0 ? Math.round((c.embedded / c.total) * 100) : 100;
                  const isExpanded = expandedCompanies.has(c.company_id);
                  const companyMissing = missingByCompany[c.company_id] ?? [];
                  const name = companyMap[c.company_id];
                  return (
                    <div key={c.company_id}>
                      <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                        <button
                          onClick={() => toggleCompany(c.company_id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          disabled={c.missing === 0}
                        >
                          {c.missing > 0
                            ? (isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)
                            : <CheckCircle className="size-4 text-green-500" />
                          }
                        </button>
                        <div className="w-48 shrink-0">
                          {name ? (
                            <p className="text-xs font-medium truncate">{name}</p>
                          ) : (
                            <code className="text-xs text-muted-foreground font-mono truncate block">{c.company_id}</code>
                          )}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{c.embedded}/{c.total}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {c.missing > 0 && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 shrink-0">
                            {c.missing} ناقص
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={c.missing > 0 ? "default" : "outline"}
                          className="shrink-0 h-7 text-xs gap-1"
                          disabled={isRunning || syncing !== null}
                          onClick={() => triggerSync(c.company_id)}
                        >
                          <Play className="size-3" />
                          مزامنة
                        </Button>
                      </div>
                      {isExpanded && companyMissing.length > 0 && (
                        <div className="bg-amber-50/50 border-t px-8 py-2 space-y-1">
                          <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                            <Info className="size-3" />
                            المنتجات غير المُضَمَّنة ({companyMissing.length})
                          </p>
                          {companyMissing.map(p => (
                            <div key={p.id} className="flex items-center gap-2 text-xs py-0.5">
                              <span className="text-foreground font-medium">{p.name}</span>
                              {p.sku && <code className="text-muted-foreground font-mono">{p.sku}</code>}
                            </div>
                          ))}
                          {companyMissing.length >= 500 && (
                            <p className="text-xs text-muted-foreground italic">* يُعرض حد 500 منتج فقط</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── KNOWLEDGE EMBEDDINGS ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-purple-600" />
              <h2 className="text-sm font-bold">تضمينات المعرفة</h2>
              <span className="text-xs text-muted-foreground">(الأسئلة الشائعة والسياسات)</span>
            </div>
            <Button
              size="sm"
              onClick={() => triggerKnowledgeSync()}
              disabled={kIsRunning || kSyncing}
              className="gap-1.5"
            >
              {kIsRunning
                ? <><RefreshCw className="size-3.5 animate-spin" /> جارٍ المزامنة...</>
                : <><Play className="size-3.5" /> مزامنة الكل</>
              }
            </Button>
          </div>

          <JobCard job={kJob} scheduleHour={3} scheduleMinute={30} />

          {kSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold">{kSummary.total_faqs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي الأسئلة</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className={`text-2xl font-bold ${kSummary.missing_faqs > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {kSummary.embedded_faqs.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">أسئلة مُضَمَّنة</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold">{kSummary.total_policies.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي السياسات</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className={`text-2xl font-bold ${kSummary.missing_policies > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {kSummary.embedded_policies.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">سياسات مُضَمَّنة</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">تفاصيل الشركات — المعرفة</span>
                <Badge variant="secondary" className="mr-auto text-xs">{filteredKCompanies.length} / {kCompanies.length} شركة</Badge>
              </div>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الـ ID..."
                  value={knowledgeSearch}
                  onChange={e => setKnowledgeSearch(e.target.value)}
                  className="w-full rounded-lg border bg-background pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {filteredKCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Layers className="size-8 opacity-40" />
                <p className="text-sm">{kCompanies.length === 0 ? "لا توجد بيانات — شغّل المزامنة أولاً" : "لا توجد نتائج للبحث"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredKCompanies.map(c => {
                  const totalK = c.total_faqs + c.total_policies;
                  const embeddedK = c.embedded_faqs + c.embedded_policies;
                  const missingK = c.missing_faqs + c.missing_policies;
                  const pct = totalK > 0 ? Math.round((embeddedK / totalK) * 100) : 100;
                  const name = companyMap[c.company_id];
                  return (
                    <div key={c.company_id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <div className="text-muted-foreground">
                        {missingK === 0
                          ? <CheckCircle className="size-4 text-green-500" />
                          : <AlertCircle className="size-4 text-amber-500" />
                        }
                      </div>
                      <div className="w-48 shrink-0">
                        {name ? (
                          <p className="text-xs font-medium truncate">{name}</p>
                        ) : (
                          <code className="text-xs text-muted-foreground font-mono truncate block">{c.company_id}</code>
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            أسئلة: {c.embedded_faqs}/{c.total_faqs} &nbsp;|&nbsp;
                            سياسات: {c.embedded_policies}/{c.total_policies}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 70 ? "bg-purple-500" : "bg-amber-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {missingK > 0 && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 shrink-0">
                          {missingK} ناقص
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={missingK > 0 ? "default" : "outline"}
                        className="shrink-0 h-7 text-xs gap-1"
                        disabled={kIsRunning || kSyncing}
                        onClick={() => triggerKnowledgeSync(c.company_id)}
                      >
                        <Play className="size-3" />
                        مزامنة
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminProductEmbeddings;
