import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  ShieldAlert,
  Smartphone,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  X,
  AlertTriangle,
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
      console.warn('⚠️ [ANDROID-UPDATE] Update check failed:', err);
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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-[#09090b] text-slate-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ring-1 ring-white/10"
        style={{
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header Ribbon */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            isEnforced
              ? 'bg-rose-950/40 border-rose-900/40 text-rose-200'
              : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isEnforced ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isEnforced ? (
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Smartphone className="w-5 h-5 flex-shrink-0" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase opacity-90 block">
                {isEnforced ? 'تحديث إلزامي فوري' : 'تحديث جديد متوفر'}
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                تطبيق MaxP للأندرويد
              </span>
            </div>
          </div>

          {!isEnforced && (
            <button
              onClick={handleSnooze}
              aria-label="إغلاق التنبيه"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-right" dir="rtl">
          {/* Version Comparison Card */}
          <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">الإصدار المثبت</span>
              <span className="text-sm font-mono font-medium text-slate-300 tabular-nums">
                v{currentVersion}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10">
                ←
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs text-slate-400">الإصدار الأحدث</span>
              <span
                className={`text-sm font-mono font-bold tabular-nums ${
                  isEnforced ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                v{latestVersion}
              </span>
            </div>
          </div>

          {/* Headline & Description */}
          <div>
            <h3
              id="update-modal-title"
              className="text-base font-bold text-white tracking-tight mb-1 text-balance"
            >
              {isEnforced
                ? 'يجب تحديث التطبيق للمتابعة بأمان'
                : 'إصدار جديد متاح لتحسين تجربة عملك'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed text-pretty">
              {versionInfo.releaseNotesAr ||
                (isEnforced
                  ? 'يتضمن هذا التحديث متطلبات تشغيلية وأمنية هامة لا يمكن بدونها الاستمرار في استخدام التطبيق الحالي.'
                  : 'يتضمن هذا التحديث تحسينات في الأداء وسرعة الاستجابة وميزات إضافية لمنصة MaxP.')}
            </p>
          </div>

          {/* Changelog Highlights */}
          {features.length > 0 && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                أبرز ما في هذا التحديث:
              </span>
              <ul className="space-y-1.5">
                {features.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-400 leading-snug"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Installation Helper Notice */}
          <div className="p-2.5 bg-blue-950/20 border border-blue-900/30 rounded-lg flex items-start gap-2 text-xs text-blue-200">
            <Download className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              عند الضغط على التحديث، سيتم تحميل ملف <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">MaxP.apk</code> مباشرة. افتح الملف واضغط على <strong className="text-white">"تثبيت"</strong> لإكمال التحديث في ثوانٍ.
            </p>
          </div>

          {versionInfo.fileSizeFormatted && (
            <div className="text-[11px] text-slate-500 text-center tabular-nums">
              حجم الحزمة: {versionInfo.fileSizeFormatted}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex flex-col gap-2.5" dir="rtl">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-all active:scale-[0.97] duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 ${
              isEnforced
                ? 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-500'
            }`}
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري بدء التحميل…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل وتثبيت التحديث الآن</span>
              </>
            )}
          </button>

          {isEnforced ? (
            <button
              onClick={handleExit}
              className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white/20 rounded-lg"
            >
              <span>إغلاق التطبيق لعدم الرغبة في التحديث الآن</span>
            </button>
          ) : (
            <button
              onClick={handleSnooze}
              className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white/20 rounded-lg"
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
