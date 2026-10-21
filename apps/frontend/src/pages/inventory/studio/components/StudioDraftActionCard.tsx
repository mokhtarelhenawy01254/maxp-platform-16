import React from "react";
import { Zap, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import type { StudioDraftAction } from "../../../components/agent-studio/types";

interface StudioDraftActionCardProps {
  draft: StudioDraftAction;
  currentPriceFallback: number;
  isApplying: boolean;
  actionSuccessMessage: string | null;
  actionErrorMessage: string | null;
  onApplyDraft: () => void;
  onDismissDraft?: () => void;
}

export const StudioDraftActionCard: React.FC<StudioDraftActionCardProps> = ({
  draft,
  currentPriceFallback,
  isApplying,
  actionSuccessMessage,
  actionErrorMessage,
  onApplyDraft,
  onDismissDraft,
}) => {
  return (
    <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-indigo-600 text-white">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-100">
            {draft.title || "مسودة توصية من وكيل المخزون"}
          </h4>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-bold">
          بانتظار الاعتماد
        </span>
      </div>

      {draft.reason && (
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
          {draft.reason}
        </p>
      )}

      {/* Value Comparison */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 block mb-0.5">القيمة الحالية</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums font-mono">
            {draft.currentValue !== undefined ? draft.currentValue : currentPriceFallback}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mb-0.5 font-bold">
            القيمة المقترحة
          </span>
          <span className="text-sm font-black text-emerald-800 dark:text-emerald-200 tabular-nums font-mono">
            {draft.proposedValue}
          </span>
        </div>
      </div>

      {/* Success / Error Banners */}
      {actionSuccessMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onApplyDraft}
          disabled={isApplying}
          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isApplying ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>اعتماد وتطبيق الإجراء</span>
        </button>

        {onDismissDraft && (
          <button
            type="button"
            onClick={onDismissDraft}
            disabled={isApplying}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs transition cursor-pointer"
          >
            تجاهل
          </button>
        )}
      </div>
    </div>
  );
};
