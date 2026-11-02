import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  RefreshCw,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  Activity,
} from "lucide-react";
import { AgentItem, tryApiFetch } from "./types";
import { ShippingFollowUpSection } from "./sections/ShippingFollowUpSection";
import { GoalsStockSection } from "./sections/GoalsStockSection";

interface AgentAutomationTabProps {
  agent: AgentItem | null;
}

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  metadata?: string | null;
}

interface RunSummary {
  scanned?: number;
  alerts?: number;
  tickets?: number;
  checkedCompanies?: number;
  targetAlertsSent?: number;
  stockAlertsSent?: number;
  skipped?: number | string;
  errors?: any[];
}

interface AgentRuntimeStatus {
  agentId: string;
  running: number;
  queued: number;
  retrying: number;
  dead: number;
  lastRunAt: string | null;
}

interface RuntimeResponse {
  success: boolean;
  queued: number;
  running: number;
  retrying: number;
  dead: number;
  agents?: AgentRuntimeStatus[];
}

export const AgentAutomationTab: React.FC<AgentAutomationTabProps> = ({ agent }) => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [runtimeAgents, setRuntimeAgents] = useState<AgentRuntimeStatus[]>([]);
  const [runtimeTotals, setRuntimeTotals] = useState<{ running: number; queued: number } | null>(null);

  const loadRuntime = async () => {
    try {
      const res = await tryApiFetch<RuntimeResponse>('/api/v1/agent-manager/runtime');
      if (res?.success) {
        setRuntimeTotals({ running: res.running || 0, queued: res.queued || 0 });
        if (Array.isArray(res.agents)) {
          setRuntimeAgents(res.agents);
        }
      }
    } catch (_) {
      // ignore
    }
  };

  useEffect(() => {
    loadRuntime();
    const interval = setInterval(loadRuntime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Determine slug from templateSlug or fallback
  const isStockTarget =
    agent?.templateSlug === "stock-target-monitor-agent" ||
    (agent as any)?.slug === "stock-target-monitor-agent" ||
    agent?.role?.toUpperCase() === "STOCK_TARGET_MONITOR" ||
    Boolean(agent?.name && (agent.name.includes("متابعة") || agent.name.includes("أهداف") || agent.name.includes("المخزون والتارجت") || agent.name.includes("مستهدفات")));

  const slug = isStockTarget
    ? "stock-target-monitor-agent"
    : (agent?.templateSlug || "shipping-agent");

  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await tryApiFetch<{ success: boolean; alerts: AlertItem[] }>(
        `/api/v1/agent-automation/${slug}/alerts?limit=20`
      );
      if (res?.success && Array.isArray(res.alerts)) {
        setAlerts(res.alerts);
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [slug]);

  const handleRunNow = async () => {
    setRunning(true);
    setRunError(null);
    setRunSummary(null);

    try {
      const res = await tryApiFetch<{ success: boolean; summary: RunSummary; error?: string }>(
        `/api/v1/agent-automation/${slug}/run`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (res?.success && res.summary) {
        setRunSummary(res.summary);
        await loadAlerts();
      } else {
        setRunError(res?.error || "فشل تنفيذ عملية التشغيل الآن");
      }
    } catch (err: any) {
      setRunError(err.message || "حدث خطأ غير متوقع أثناء التشغيل");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Agent Runtime Status Card (T32) */}
      <div className="p-4 rounded-xl border border-border/70 bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {t("agentProfiles.automation.parallelRuntime", "حالة التشغيل المتوازي للوكلاء")}
            </span>
          </div>
          {runtimeTotals && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>شغال حالياً: <strong className="text-emerald-600 dark:text-emerald-400">{runtimeTotals.running}</strong></span>
              <span>في الطابور: <strong className="text-amber-600 dark:text-amber-400">{runtimeTotals.queued}</strong></span>
            </div>
          )}
        </div>

        {runtimeAgents.length === 0 ? (
          <div className="text-xs text-muted-foreground py-1">
            لا توجد مهام تشغيل حالية في الطابور.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {runtimeAgents.map((ag) => {
              const isRunning = ag.running > 0;
              const isQueued = !isRunning && ag.queued > 0;
              const isDone = !isRunning && !isQueued;
              const isCurrent = agent && agent.id === ag.agentId;

              return (
                <div
                  key={ag.agentId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isCurrent
                      ? "border-primary/50 bg-primary/5 font-medium"
                      : "border-border/60 bg-muted/30"
                  }`}
                >
                  <span className="text-foreground">{ag.agentId}</span>
                  {isRunning && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      شغال
                    </span>
                  )}
                  {isQueued && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      في الطابور
                    </span>
                  )}
                  {isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal bg-muted text-muted-foreground">
                      <CheckCircle2 className="size-3 text-muted-foreground" />
                      خلص
                      {ag.lastRunAt && (
                        <span className="text-[10px] opacity-75">
                          ({new Date(ag.lastRunAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })})
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Run Now Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Play className="size-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("agentProfiles.automation.title", "إدارة التشغيل التلقائي والمتابعة")}
            </h3>
            <p className="text-xs text-muted-foreground">
              يمكنك تشغيل مهمة المتابعة يدويًا فورًا أو ضبط قواعد الفحص الدوري.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunNow}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          {running ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              جاري التشغيل...
            </>
          ) : (
            <>
              <Play className="size-4 fill-current" />
              تشغيل الآن
            </>
          )}
        </button>
      </div>

      {/* Run Now Result Alert */}
      {runSummary && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">اكتمل التشغيل بنجاح!</div>
            <div className="flex flex-wrap gap-4 text-xs opacity-90">
              {runSummary.scanned !== undefined && <span>الطلبات المفحوصة: <b>{runSummary.scanned}</b></span>}
              {runSummary.checkedCompanies !== undefined && <span>الشركات المفحوصة: <b>{runSummary.checkedCompanies}</b></span>}
              {runSummary.alerts !== undefined && <span>التنبيهات الصادرة: <b>{runSummary.alerts}</b></span>}
              {runSummary.targetAlertsSent !== undefined && <span>تنبيهات التارجت: <b>{runSummary.targetAlertsSent}</b></span>}
              {runSummary.stockAlertsSent !== undefined && <span>تنبيهات المخزون: <b>{runSummary.stockAlertsSent}</b></span>}
              {runSummary.tickets !== undefined && <span>التذاكر المنشأة: <b>{runSummary.tickets}</b></span>}
              {runSummary.skipped !== undefined && <span>تم التخطي: <b>{String(runSummary.skipped)}</b></span>}
              {Array.isArray(runSummary.errors) && runSummary.errors.length > 0 && (
                <span className="text-destructive font-medium">
                  أخطاء: {runSummary.errors.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {runError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {/* Dynamic Section Based on Agent Template */}
      {slug === "shipping-agent" && <ShippingFollowUpSection slug={slug} />}
      {slug === "stock-target-monitor-agent" && <GoalsStockSection slug={slug} />}
      {slug !== "shipping-agent" && slug !== "stock-target-monitor-agent" && (
        <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm space-y-2 bg-card/40">
          <Layers className="size-8 mx-auto text-muted-foreground/60" />
          <div className="font-medium text-foreground">قسم التشغيل التلقائي لهذا الوكيل</div>
          <div className="text-xs">
            يتم دعم إعدادات التشغيل التلقائي المتخصصة لكل وكيل وفقًا لمجال عمله.
          </div>
        </div>
      )}

      {/* Recent Alerts Audit Log */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              سجل التنبيهات الصادرة مؤخراً ({alerts.length})
            </h4>
          </div>

          <button
            onClick={loadAlerts}
            disabled={loadingAlerts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loadingAlerts ? "animate-spin" : ""}`} />
            تحديث السجل
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            لم تصدر أي تنبيهات متابعة مؤخرًا.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${
                        al.severity === "high"
                          ? "bg-red-500"
                          : al.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    {al.title}
                  </div>
                  <div className="text-muted-foreground leading-relaxed">{al.message}</div>
                </div>

                <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="size-3" />
                  {new Date(al.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
