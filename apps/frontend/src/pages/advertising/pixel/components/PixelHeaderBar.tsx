import React from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ShieldCheckIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

interface PixelHeaderBarProps {
  isPixelActive: boolean;
  isCapiActive: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onRefreshDiagnostics: () => void;
  isRefreshing: boolean;
}

export const PixelHeaderBar: React.FC<PixelHeaderBarProps> = ({
  isPixelActive,
  isCapiActive,
  isSaving,
  isDirty,
  onSave,
  onRefreshDiagnostics,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3.5 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left / Start: Title and telemetry badges */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <SignalIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Facebook Pixel & Conversions API
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono hidden sm:block">
                Meta Graph API v26.0 • Client & Server Hybrid Attribution
              </p>
            </div>
          </div>

          {/* Telemetry Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isPixelActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPixelActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="font-mono text-[11px]">Browser:</span>
              <span>{isPixelActive ? "نشط" : "معطل"}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isCapiActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCapiActive ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span className="font-mono text-[11px]">CAPI:</span>
              <span>{isCapiActive ? "متصل" : "بحاجة لتوكن"}</span>
            </span>

            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-mono">Deduplication & SHA-256</span>
            </span>
          </div>
        </div>

        {/* Right / End: Actions */}
        <div className="flex items-center gap-2 mr-auto sm:mr-0">
          <button
            type="button"
            onClick={onRefreshDiagnostics}
            disabled={isRefreshing}
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.97] flex items-center gap-1.5 min-h-[38px]"
            title="تحديث مؤشرات الاتصال والتشخيص"
            aria-label="تحديث التشخيص"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
            />
            <span className="hidden sm:inline">فحص الاتصال</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-2 min-h-[38px] shadow-sm ${
              isDirty
                ? "bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/30"
                : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90"
            }`}
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ…</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>حفظ التعديلات</span>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
