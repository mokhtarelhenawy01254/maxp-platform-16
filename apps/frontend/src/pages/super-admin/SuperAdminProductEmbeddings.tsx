import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import {
  Database, RefreshCw, Play, CheckCircle, Clock, Layers,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { JobCard, JobState } from "./SuperAdminEmbeddingsJobCard";
import {
  SuperAdminKnowledgeEmbeddingsSection,
  type KnowledgeStatusData,
} from "./SuperAdminKnowledgeEmbeddingsSection";
import {
  SuperAdminProductEmbeddingsCompanyList,
  type CompanyStat,
  type MissingProduct,
} from "./SuperAdminProductEmbeddingsCompanyList";

interface StatusData {
  job: JobState;
  summary: { total_products: number; total_embedded: number; total_missing: number };
  companies: CompanyStat[];
  missing_products: MissingProduct[];
}

export default function SuperAdminProductEmbeddings() {
  const [data, setData] = useState<StatusData | null>(null);
  const [kData, setKData] = useState<KnowledgeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [kSyncing, setKSyncing] = useState(false);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
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

  const isRunning = data?.job?.status === "running";
  const kIsRunning = kData?.job?.status === "running";

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex justify-center items-center min-h-[40vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const job = data?.job;
  const summary = data?.summary;
  const companies = data?.companies ?? [];
  const missingProducts = data?.missing_products ?? [];

  const missingByCompany: Record<string, MissingProduct[]> = {};
  for (const p of missingProducts) {
    if (!missingByCompany[p.company_id]) missingByCompany[p.company_id] = [];
    missingByCompany[p.company_id].push(p);
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Linear Single-Surface Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Database className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              مزامنة التضمينات الدلالية بالذكاء الاصطناعي
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Vector Telemetry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة متجهات المنتجات والكتالوجات وقواعد المعرفة للبحث الدلالي اللحظي
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => Promise.all([load(), loadKnowledge()])}
            className="h-8 px-2.5 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Ribbon for Product Embeddings */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">إجمالي المنتجات</p>
              <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
                {summary.total_products.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">في جميع الكتالوجات</p>
            </div>
            <div className="size-7 rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Layers className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">منتجات مُضَمَّنة</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                {summary.total_embedded.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">جاهزة للبحث البصري</p>
            </div>
            <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">مفقودة التضمين</p>
              <p className={cn("text-xl font-bold tracking-tight font-mono tabular-nums mt-0.5", summary.total_missing > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                {summary.total_missing.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تتطلب مزامنة</p>
            </div>
            <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-primary">نسبة التغطية الفعالة</p>
              <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
                {summary.total_products > 0
                  ? `${Math.round((summary.total_embedded / summary.total_products) * 100)}%`
                  : "100%"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">اكتمال المتجهات</p>
            </div>
            <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Database className="size-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Product Embeddings */}
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3.5">
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

        <SuperAdminProductEmbeddingsCompanyList
          companies={companies}
          companyMap={companyMap}
          missingByCompany={missingByCompany}
          isRunning={isRunning}
          syncing={syncing}
          onTriggerSync={triggerSync}
        />
      </div>

      {/* Section 2: Knowledge Embeddings */}
      <SuperAdminKnowledgeEmbeddingsSection
        kData={kData}
        kIsRunning={kIsRunning}
        kSyncing={kSyncing}
        companyMap={companyMap}
        onTriggerSync={triggerKnowledgeSync}
      />
    </div>
  );
}
