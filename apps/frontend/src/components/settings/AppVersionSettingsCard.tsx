import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentAppVersion,
  fetchLatestAndroidVersion,
  checkAppUpdate,
  openUpdateDownload,
  isAndroidAppEnvironment,
  AppVersionInfo,
} from "../../services/appUpdateService";
import { AndroidAppUpdateModal } from "../mobile/AndroidAppUpdateModal";

export const AppVersionSettingsCard: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<{ version: string; build: number }>({
    version: "1.0.8",
    build: 8,
  });
  const [latestInfo, setLatestInfo] = useState<AppVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const isAndroid = isAndroidAppEnvironment();

  const loadVersionData = useCallback(async (manual = false) => {
    try {
      if (manual) setChecking(true);
      const [current, latest] = await Promise.all([
        getCurrentAppVersion(),
        fetchLatestAndroidVersion().catch(() => null),
      ]);

      setCurrentVersion(current);
      if (latest) {
        setLatestInfo(latest);
      }

      if (manual) {
        const updateCheck = await checkAppUpdate();
        if (updateCheck.hasUpdate) {
          toast.info(`يتوفر تحديث جديد v${updateCheck.versionInfo?.latestVersion} جاهز للتحميل`);
          setShowUpdateModal(true);
        } else {
          toast.success("أنت تعمل حالياً على أحدث إصدار متاح للمنصة");
        }
      }
    } catch {
      if (manual) {
        toast.error("تعذر الاتصال بخادم التحديثات حالياً");
      }
    } finally {
      if (manual) setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadVersionData(false);
  }, [loadVersionData]);

  const hasUpdate =
    latestInfo &&
    (Boolean((latestInfo.latestVersionCode || 0) > currentVersion.build) ||
      latestInfo.latestVersion !== currentVersion.version);

  return (
    <>
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs text-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  تطبيق MaxP للهاتف المحمول
                </h3>
                <span
                  className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded-full border ${
                    isAndroid
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border/60"
                  }`}
                >
                  {isAndroid ? "تطبيق أندرويد مثبت" : "متصفح الويب"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                معلومات الحزمة المثبتة ومزامنة الاتصال الهاتفي السحابي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => loadVersionData(true)}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 bg-background hover:bg-muted/40 text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-primary" : ""}`} />
              <span>{checking ? "جاري الفحص…" : "فحص التحديثات"}</span>
            </button>

            <button
              type="button"
              onClick={() => openUpdateDownload(latestInfo?.directApkUrl || latestInfo?.downloadUrl)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل ملف APK</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">الإصدار المثبت حالياً</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-semibold font-mono text-foreground tabular-nums">
                v{currentVersion.version}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                (بناء {currentVersion.build})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">أحدث إصدار على السيرفر</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-semibold font-mono text-foreground tabular-nums">
                v{latestInfo?.latestVersion || "1.0.9"}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                (بناء {latestInfo?.latestVersionCode || 9})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">حالة التحديث</span>
            <div className="flex items-center gap-1.5 mt-1">
              {hasUpdate ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    يتوفر إصدار أحدث جاهز
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    محدث لآخر إصدار
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feature Notice */}
        {latestInfo?.featuresAr && latestInfo.featuresAr.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-muted/15 border border-border/60">
            <span className="text-xs font-semibold text-foreground block mb-1.5">
              مزايا أحدث إصدار (v{latestInfo.latestVersion}):
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {latestInfo.featuresAr.map((feat, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="truncate">{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showUpdateModal && (
        <AndroidAppUpdateModal
          forceOpen={true}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </>
  );
};

export default AppVersionSettingsCard;
