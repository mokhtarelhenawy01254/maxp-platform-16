import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  checkAppUpdate,
  shouldShowUpdateModal,
  snoozeUpdate,
  openUpdateDownload,
  exitAndroidApp,
  isAndroidAppEnvironment,
  UpdateCheckResult,
} from '../../services/appUpdateService';
import { cn } from '@/lib/utils';

interface AndroidAppUpdateModalProps {
  /**
   * Optional manual trigger override for testing or manual check in settings
   */
  forceOpen?: boolean;
  onClose?: () => void;
}

export const AndroidAppUpdateModal: React.FC<AndroidAppUpdateModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(null);

  const performCheck = useCallback(async (manual = false) => {
    // Only execute automatically in Android app environments unless manually requested
    if (!manual && !isAndroidAppEnvironment()) {
      return;
    }

    setChecking(true);
    try {
      const result = await checkAppUpdate();
      setUpdateData(result);

      if (manual) {
        setIsOpen(result.hasUpdate);
      } else if (shouldShowUpdateModal(result)) {
        setIsOpen(true);
      }
    } catch (err) {
      console.warn('[ANDROID-UPDATE] Update check failed:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  // Check on component mount
  useEffect(() => {
    performCheck(forceOpen);
  }, [performCheck, forceOpen]);

  // Handle Capacitor App resume event to re-verify updates on foregrounding
  useEffect(() => {
    const win = window as any;
    let removeResumeListener: (() => void) | undefined;

    if (typeof win !== 'undefined' && win.Capacitor?.Plugins?.App?.addListener) {
      try {
        win.Capacitor.Plugins.App.addListener('resume', () => {
          performCheck(false);
        }).then((handle: any) => {
          removeResumeListener = () => handle?.remove?.();
        });
      } catch {}
    }

    return () => {
      removeResumeListener?.();
    };
  }, [performCheck]);

  // Intercept hardware back button when a mandatory update modal is active
  useEffect(() => {
    if (!isOpen || !updateData?.isMandatory) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, updateData?.isMandatory]);

  if (!isOpen || !updateData?.versionInfo) {
    return null;
  }

  const { versionInfo, isMandatory, currentVersion } = updateData;
  const latestVersion = versionInfo.latestVersion;
  const isEnforced = isMandatory;

  const handleDownload = () => {
    setDownloading(true);
    openUpdateDownload(versionInfo.directApkUrl || versionInfo.downloadUrl);
    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  };

  const handleSnooze = () => {
    if (isEnforced) return;
    snoozeUpdate(latestVersion);
    setIsOpen(false);
    onClose?.();
  };

  const handleExit = () => {
    exitAndroidApp();
  };

  const features = versionInfo.featuresAr || [
    'تحسينات في سرعة استجابة التطبيق والمزامنة',
    'إصلاحات أمنية واستقرار شامل لبيئة العمل',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      data-open="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
    >
      <div
        className="w-full max-w-md bg-card text-foreground rounded-2xl border border-border/70 shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Ribbon */}
        <div
          className={cn(
            "px-5 py-3.5 flex items-center justify-between border-b border-border/60",
            isEnforced
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "p-2 rounded-xl flex items-center justify-center shrink-0 border",
                isEnforced
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
              )}
            >
              {isEnforced ? (
                <ShieldAlert className="size-5 shrink-0" />
              ) : (
                <Smartphone className="size-5 shrink-0" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase block font-mono">
                {isEnforced ? 'تحديث إلزامي فوري' : 'تحديث جديد متوفر'}
              </span>
              <span className="text-sm font-bold text-foreground tracking-tight">
                تطبيق MaxP للأندرويد
              </span>
            </div>
          </div>

          {!isEnforced && (
            <button
              onClick={handleSnooze}
              aria-label="إغلاق التنبيه"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-right no-scrollbar" dir="rtl">
          {/* Version Comparison Card */}
          <div className="p-3.5 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">الإصدار المثبت</span>
              <span className="text-sm font-mono font-medium text-foreground tabular-nums">
                v{currentVersion}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowLeft className="size-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs text-muted-foreground">الإصدار الأحدث</span>
              <span
                className={cn(
                  "text-sm font-mono font-bold tabular-nums",
                  isEnforced ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                v{latestVersion}
              </span>
            </div>
          </div>

          {/* Headline & Description */}
          <div>
            <h3
              id="update-modal-title"
              className="text-base font-semibold text-foreground tracking-tight mb-1 text-balance"
            >
              {isEnforced
                ? 'يجب تحديث التطبيق للمتابعة بأمان'
                : 'إصدار جديد متاح لتحسين تجربة عملك'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
              {versionInfo.releaseNotesAr ||
                (isEnforced
                  ? 'يتضمن هذا التحديث متطلبات تشغيلية وأمنية هامة لا يمكن بدونها الاستمرار في استخدام التطبيق الحالي.'
                  : 'يتضمن هذا التحديث تحسينات في الأداء وسرعة الاستجابة وميزات إضافية لمنصة MaxP.')}
            </p>
          </div>

          {/* Changelog Highlights */}
          {features.length > 0 && (
            <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                أبرز ما في هذا التحديث:
              </span>
              <ul className="space-y-1.5">
                {features.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-muted-foreground leading-snug"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Installation Helper Notice */}
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 text-xs text-primary">
            <Download className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              عند الضغط على التحديث، سيتم تحميل ملف <code className="text-foreground font-mono bg-muted px-1 py-0.5 rounded text-[11px]">MaxP.apk</code> مباشرة. افتح الملف واضغط على <strong className="text-foreground">"تثبيت"</strong> لإكمال التحديث في ثوانٍ.
            </p>
          </div>

          {versionInfo.fileSizeFormatted && (
            <div className="text-[11px] text-muted-foreground text-center font-mono tabular-nums">
              حجم الحزمة: {versionInfo.fileSizeFormatted}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-muted/20 border-t border-border/60 flex flex-col gap-2" dir="rtl">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={cn(
              "w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-[0.98] duration-150 cursor-pointer",
              isEnforced
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            )}
          >
            {downloading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>جاري بدء التحميل…</span>
              </>
            ) : (
              <>
                <Download className="size-4" />
                <span>تحميل وتثبيت التحديث الآن</span>
              </>
            )}
          </button>

          {isEnforced ? (
            <button
              onClick={handleExit}
              className="w-full py-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5 rounded-lg cursor-pointer"
            >
              <span>إغلاق التطبيق لعدم الرغبة في التحديث الآن</span>
            </button>
          ) : (
            <button
              onClick={handleSnooze}
              className="w-full py-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 rounded-lg cursor-pointer"
            >
              <span>تذكيري لاحقاً (غداً)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AndroidAppUpdateModal;
