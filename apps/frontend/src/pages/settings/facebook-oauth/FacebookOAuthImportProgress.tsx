import React, { useCallback, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { envConfig } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";
import { useAuth } from "../../../hooks/useAuthSimple";

/**
 * عنوان الـ event اللي الكارت بيبعته بعد ما يعيد تشغيل الاستيراد،
 * عشان الـ controller يبدأ الـ polling من غير props جديدة.
 */
export const FACEBOOK_IMPORT_QUEUED_EVENT = "facebook-oauth-import-queued";

export type FacebookImportStatus = "queued" | "running" | "completed" | "failed";

export interface FacebookImportProgress {
  status: FacebookImportStatus;
  total: number;
  processed: number;
  done: number;
  failed: number;
  skipped: number;
  queuedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  lastError?: string | null;
}

const STATUSES: FacebookImportStatus[] = ["queued", "running", "completed", "failed"];

const toCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * يحوّل أي payload خارجي (من /status) لشكل آمن — بيرجع null لو مفيش بيانات.
 */
export const normalizeFacebookImportProgress = (
  raw: unknown,
): FacebookImportProgress | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const status = record["status"];
  if (typeof status !== "string" || !STATUSES.includes(status as FacebookImportStatus)) {
    return null;
  }

  const total = toCount(record["total"]);
  const done = toCount(record["done"]);
  const failed = toCount(record["failed"]);
  const skipped = toCount(record["skipped"]);
  const processedRaw = toCount(record["processed"]);

  return {
    status: status as FacebookImportStatus,
    total,
    done,
    failed,
    skipped,
    processed: Math.max(processedRaw, done + failed + skipped),
    queuedAt: typeof record["queuedAt"] === "string" ? record["queuedAt"] : null,
    startedAt: typeof record["startedAt"] === "string" ? record["startedAt"] : null,
    finishedAt: typeof record["finishedAt"] === "string" ? record["finishedAt"] : null,
    lastError: typeof record["lastError"] === "string" ? record["lastError"] : null,
  };
};

export const createQueuedImportProgress = (): FacebookImportProgress => ({
  status: "queued",
  total: 0,
  processed: 0,
  done: 0,
  failed: 0,
  skipped: 0,
  queuedAt: new Date().toISOString(),
  startedAt: null,
  finishedAt: null,
  lastError: null,
});

// ---- شريط تقدم بسيط في الذاكرة (best-effort hint فقط، الداتابيز هي المصدر) ----

let currentProgress: FacebookImportProgress | null = null;
const listeners = new Set<() => void>();

export const publishFacebookImportProgress = (
  next: FacebookImportProgress | null,
): void => {
  if (JSON.stringify(next) === JSON.stringify(currentProgress)) return;
  currentProgress = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): FacebookImportProgress | null => currentProgress;

export const useFacebookImportProgress = (): FacebookImportProgress | null =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

interface FacebookOAuthImportProgressProps {
  className?: string;
}

/**
 * سطر تقدم استيراد الصفحات + شريط تقدم + زرار إعادة المحاولة عند الفشل.
 * بيقرأ من الـ store بدل props عشان يشتغل جوه FacebookOAuthConnectCard
 * من غير أي تغيير في توقيع الكارت.
 */
export const FacebookOAuthImportProgress: React.FC<
  FacebookOAuthImportProgressProps
> = ({ className = "" }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const progress = useFacebookImportProgress();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = useCallback(async () => {
    if (!user?.companyId || retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/import-pages?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({}),
        },
      );
      const data = await response.json();
      if (data?.success) {
        publishFacebookImportProgress(
          normalizeFacebookImportProgress(data.importProgress) ||
            createQueuedImportProgress(),
        );
        window.dispatchEvent(new Event(FACEBOOK_IMPORT_QUEUED_EVENT));
      } else {
        setRetryError(
          data?.message ||
            t("facebookOAuth.importRetryFailed" as any, "تعذّر بدء استيراد الصفحات"),
        );
      }
    } catch {
      setRetryError(
        t("facebookOAuth.importRetryFailed" as any, "تعذّر بدء استيراد الصفحات"),
      );
    } finally {
      setRetrying(false);
    }
  }, [retrying, t, user?.companyId]);

  if (!progress) return null;

  const total = progress.total;
  const processed = Math.max(0, progress.processed);
  const percent =
    total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : progress.status === "completed"
        ? 100
        : 0;

  if (progress.status === "completed") {
    // خلص بـ 0 صفحات: سيب التنبيهات (no page grants) تتكلم بدل سطر تقدم فاضي.
    if (progress.done === 0) return null;
    return (
      <div
        role="status"
        aria-live="polite"
        className={`mt-4 flex w-full max-w-md items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-start text-[11px] text-emerald-700 dark:text-emerald-300 ${className}`}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="leading-normal">
          {t("facebookOAuth.importCompletedPages" as any, {
            count: progress.done,
            defaultValue: "تم ربط {{count}} صفحة",
          })}
          {progress.skipped > 0 && (
            <span className="block text-emerald-600/80 dark:text-emerald-400/80">
              {t("facebookOAuth.importSkippedPages" as any, {
                count: progress.skipped,
                defaultValue: "{{count}} صفحة متخطاة (مربوطة بحساب آخر)",
              })}
            </span>
          )}
          {progress.failed > 0 && (
            <span className="block text-amber-600 dark:text-amber-400">
              {t("facebookOAuth.importFailedPages" as any, {
                count: progress.failed,
                defaultValue: "{{count}} صفحة فشلت",
              })}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (progress.status === "failed") {
    return (
      <div
        role="alert"
        className={`mt-4 w-full max-w-md rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-start ${className}`}
      >
        <div className="flex items-start gap-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-normal">
            {t("facebookOAuth.importFailed" as any, {
              defaultValue: "تعذّر استيراد الصفحات",
            })}
            {progress.lastError ? `: ${progress.lastError}` : ""}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void handleRetry()}
            disabled={retrying || !user?.companyId}
            className="h-7 gap-1.5 text-[11px] font-medium"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("facebookOAuth.importRetry" as any, "إعادة المحاولة")}
          </Button>
        </div>
        {retryError && (
          <p className="mt-1.5 text-[11px] text-destructive">{retryError}</p>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 w-full max-w-md rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-start ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("facebookOAuth.importingPages" as any, {
            done: processed,
            total,
            defaultValue: "جارٍ استيراد الصفحات… {{done}} / {{total}}",
          })}
        </span>
        <span className="tabular-nums text-blue-600/80 dark:text-blue-300/80">
          {total > 0 ? `${percent}%` : ""}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-500/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total > 0 ? total : 100}
        aria-valuenow={total > 0 ? processed : percent}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default FacebookOAuthImportProgress;
