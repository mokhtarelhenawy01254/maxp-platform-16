import React from "react";
import {
  RefreshCw,
  Pause,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface ImportJobProgressBannerProps {
  activeJob: any;
  pauseBackendImport: () => void;
  resumeBackendImport: () => void;
  cancelBackendImport: () => void;
}

export const ImportJobProgressBanner: React.FC<ImportJobProgressBannerProps> = ({
  activeJob,
  pauseBackendImport,
  resumeBackendImport,
  cancelBackendImport,
}) => {
  if (!activeJob) return null;

  return (
    <div className="mb-6 p-4 sm:p-5 bg-card rounded-xl border border-border/70 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {activeJob.status === "running" && (
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
          )}
          {activeJob.status === "paused" && (
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Pause className="h-4 w-4" />
            </div>
          )}
          {activeJob.status === "failed" && (
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <XCircle className="h-4 w-4" />
            </div>
          )}
          {activeJob.status === "completed" && (
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            {activeJob.status === "running" && "جاري الاستيراد في الخلفية..."}
            {activeJob.status === "paused" && "الاستيراد متوقف مؤقتاً"}
            {activeJob.status === "failed" && "فشل الاستيراد"}
            {activeJob.status === "completed" && "تم اكتمال الاستيراد بنجاح"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {activeJob.status === "running" && (
            <button
              type="button"
              onClick={pauseBackendImport}
              className="p-1.5 hover:bg-muted rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
              title="إيقاف مؤقت"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {activeJob.status === "paused" && (
            <button
              type="button"
              onClick={resumeBackendImport}
              className="p-1.5 hover:bg-muted rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors"
              title="استئناف"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(activeJob.status === "running" || activeJob.status === "paused") && (
            <button
              type="button"
              onClick={cancelBackendImport}
              className="p-1.5 hover:bg-muted rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
              title="إلغاء الأمر"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            activeJob.status === "failed"
              ? "bg-rose-500"
              : activeJob.status === "completed"
                ? "bg-emerald-500"
                : activeJob.status === "paused"
                  ? "bg-amber-500"
                  : "bg-primary"
          }`}
          style={{
            width: `${Math.max(5, activeJob.progress.percentage)}%`,
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground font-mono tabular-nums gap-2">
        <span>
          تمت معالجة {activeJob.progress.processedOrders} من {activeJob.progress.grandTotal} طلب (
          {Math.round(activeJob.progress.percentage)}%)
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {activeJob.progress.imported > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              تم استيراد: {activeJob.progress.imported}
            </span>
          )}
          {activeJob.progress.updated > 0 && (
            <span className="text-sky-600 dark:text-sky-400">
              تم تحديث: {activeJob.progress.updated}
            </span>
          )}
          {activeJob.progress.failed > 0 && (
            <span className="text-rose-600 dark:text-rose-400">
              فشل: {activeJob.progress.failed}
            </span>
          )}
          {activeJob.progress.skipped > 0 && (
            <span className="text-muted-foreground">
              تم تخطي: {activeJob.progress.skipped}
            </span>
          )}
        </div>
      </div>

      {activeJob.progress.error && (
        <div className="mt-2 p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-xs border border-rose-500/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>خطأ: {activeJob.progress.error}</span>
        </div>
      )}
    </div>
  );
};

export default ImportJobProgressBanner;
