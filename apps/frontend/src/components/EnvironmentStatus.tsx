import React, { useEffect, useState } from "react";
import { testApiConnection, environmentInfo } from "../utils/environmentTest";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Server,
} from "lucide-react";

interface EnvironmentStatusState {
  apiConnection: "loading" | "success" | "error";
  configValid: boolean;
  environment: string;
  apiUrl: string;
}

const EnvironmentStatus: React.FC = () => {
  const [status, setStatus] = useState<EnvironmentStatusState>({
    apiConnection: "loading",
    configValid: environmentInfo.configTest.allUrlsValid,
    environment: environmentInfo.environment,
    apiUrl: environmentInfo.apiUrl,
  });

  useEffect(() => {
    let active = true;
    const checkApiConnection = async () => {
      try {
        const result = await testApiConnection();
        if (active) {
          setStatus((prev) => ({
            ...prev,
            apiConnection: result ? "success" : "error",
          }));
        }
      } catch {
        if (active) {
          setStatus((prev) => ({
            ...prev,
            apiConnection: "error",
          }));
        }
      }
    };

    void checkApiConnection();
    return () => { active = false; };
  }, []);

  const getStatusIcon = (st: "loading" | "success" | "error") => {
    switch (st) {
      case "loading":
        return <Clock className="h-4 w-4 text-amber-500 animate-spin shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    }
  };

  const getStatusText = (st: "loading" | "success" | "error") => {
    switch (st) {
      case "loading":
        return "جاري الفحص...";
      case "success":
        return "متصل ومستقر";
      case "error":
        return "فشل الاتصال";
    }
  };

  return (
    <div className="bg-card border border-border/70 rounded-xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            حالة بيئة التشغيل والخادم
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
            status.environment === "development"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          }`}
        >
          {status.environment === "development" ? "تطوير (DEV)" : "إنتاج (PROD)"}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <span className="font-medium text-muted-foreground">رابط الواجهة الخلفية (API):</span>
          <span className="font-mono tabular-nums text-foreground text-[11px] truncate max-w-xs">
            {status.apiUrl}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <span className="font-medium text-muted-foreground">صحة الروابط والتكوين:</span>
          <div className="flex items-center gap-1.5 font-semibold">
            {status.configValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className={status.configValid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              {status.configValid ? "سليمة ومطابقة" : "غير مطابقة"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <span className="font-medium text-muted-foreground">فحص الاتصال الحي:</span>
          <div className="flex items-center gap-1.5 font-semibold">
            {getStatusIcon(status.apiConnection)}
            <span
              className={
                status.apiConnection === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : status.apiConnection === "error"
                  ? "text-destructive"
                  : "text-amber-600 dark:text-amber-400"
              }
            >
              {getStatusText(status.apiConnection)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border/60 space-y-2">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          بيانات العميل الحالية:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">المضيف</span>
            <span className="text-foreground truncate block">{window.location.hostname}</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">المنفذ</span>
            <span className="text-foreground block">{window.location.port || "80/443"}</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground block">البروتوكول</span>
            <span className="text-foreground block">{window.location.protocol.replace(":", "")}</span>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">تطابق الرابط</span>
              <span className="text-foreground block">{environmentInfo.configTest.apiUrlMatch ? "متطابق" : "مختلف"}</span>
            </div>
            <div className={`p-1 rounded-full ${environmentInfo.configTest.apiUrlMatch ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
              {environmentInfo.configTest.apiUrlMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </div>
          </div>
        </div>
      </div>

      {status.apiConnection === "error" && (
        <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-xl space-y-1">
          <h4 className="text-xs font-semibold text-destructive">
            تنبيه في الاتصال بالخادم الخلفي
          </h4>
          <p className="text-xs text-destructive/90 leading-relaxed font-mono">
            يرجى التأكد من تشغيل خادم الـ API على: {status.apiUrl}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnvironmentStatus;
