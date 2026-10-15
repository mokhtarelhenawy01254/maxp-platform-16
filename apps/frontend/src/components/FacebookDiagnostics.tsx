import React, { useState, useEffect, useCallback } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RotateCw,
  Clock,
  Server,
  Database,
} from "lucide-react";

interface DiagnosticIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  details: string;
}

interface DiagnosticRecommendation {
  type: string;
  priority: "high" | "medium" | "low";
  message: string;
  action: string;
}

interface FacebookDiagnosticPage {
  pageName?: string;
  pageId?: string;
  status?: string;
  [key: string]: unknown;
}

interface DiagnosticsData {
  timestamp: string;
  server: {
    status: string;
    port: number;
    environment: string;
    uptime: number;
  };
  database: {
    status: string;
    connection: boolean;
    tables: Record<string, number>;
  };
  facebook: {
    config: {
      appId: string;
      appSecret: string;
      webhookVerifyToken: string;
      backendUrl: string;
    };
    pages: {
      total: number;
      connected: number;
      list?: FacebookDiagnosticPage[];
    };
    webhooks: {
      url: string;
      verifyToken: string;
      lastReceived: string;
    };
  };
  issues: DiagnosticIssue[];
  recommendations: DiagnosticRecommendation[];
}

const FacebookDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        buildApiUrl("integrations/facebook/diagnostics"),
        {
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setDiagnostics(data.data);
        setLastRun(new Date().toLocaleString("ar-EG"));
      } else {
        const errorMsg = data.error || "فشل التشخيص";
        setError(errorMsg);
      }
    } catch (err: unknown) {
      const errorMsg = `خطأ في التشخيص: ${err instanceof Error ? err.message : "حدث خطأ غير متوقع"}`;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "info":
      default:
        return <Info className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/25";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "low":
      default:
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
      case "connected":
      case "configured":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "error":
        return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      case "mock-mode":
      case "unknown":
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            تشخيص ربط وتكامل Facebook
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            فحص شامل لخدمات Webhook، التطبيق، قاعدة البيانات، والصفحات المتصلة
          </p>
          {lastRun && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono tabular-nums">
              <Clock className="h-3 w-3" />
              <span>آخر فحص: {lastRun}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "جاري الفحص..." : "تشغيل التشخيص الآن"}</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {diagnostics && !loading && (
        <>
          {/* Server & DB Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-card rounded-xl border border-border/70 p-4 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-foreground">حالة الخادم الخلفي</h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {getStatusIcon(diagnostics.server.status)}
                  <span className="font-mono tabular-nums text-muted-foreground text-[11px]">
                    Port {diagnostics.server.port} • {formatUptime(diagnostics.server.uptime)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/70 p-4 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-foreground">قاعدة البيانات</h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {getStatusIcon(diagnostics.database.status)}
                  <span className="text-muted-foreground text-xs font-semibold">
                    {diagnostics.database.connection ? "متصلة ومستقرة" : "غير متصلة"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Webhook */}
          <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border/60">
              إعدادات تطبيق Facebook والويب هوك
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">App ID:</span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {diagnostics.facebook.config.appId}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">App Secret:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {diagnostics.facebook.config.appSecret === "set" ? "مضبوط" : "غير مضبوط"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 col-span-1 sm:col-span-2">
                <span className="text-muted-foreground font-medium block mb-1">Webhook URL:</span>
                <code className="font-mono text-[11px] text-foreground block truncate">
                  {diagnostics.facebook.webhooks.url}
                </code>
              </div>
            </div>

            {/* Pages */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">الصفحات المتصلة</h4>
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  المجموع: {diagnostics.facebook.pages.total} • المتصلة: {diagnostics.facebook.pages.connected}
                </span>
              </div>
              {diagnostics.facebook.pages.list && diagnostics.facebook.pages.list.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {diagnostics.facebook.pages.list.map((page, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(page.status || "connected")}
                        <span className="font-semibold text-foreground">{page.pageName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">({page.pageId})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Issues */}
          {diagnostics.issues.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border/60">
                الملاحظات والمشاكل المكتشفة ({diagnostics.issues.length})
              </h3>
              <div className="space-y-2">
                {diagnostics.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs"
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{issue.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{issue.details}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-md bg-muted text-muted-foreground font-mono">
                        {issue.type} • {issue.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border/60">
                توصيات التحسين الموصى بها
              </h3>
              <div className="space-y-2">
                {diagnostics.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${getPriorityBadge(rec.priority)}`}
                  >
                    <p className="font-bold">{rec.message}</p>
                    <p className="text-[11px] opacity-90">{rec.action}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-background/50 font-mono">
                      {rec.type} • أولوية {rec.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacebookDiagnostics;
