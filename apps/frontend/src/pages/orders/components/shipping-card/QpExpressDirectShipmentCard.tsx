import React from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export interface QpExpressDirectShipmentCardProps {
  qpSettings: { customerId?: string | number } | null | undefined;
  qpNotes: string;
  setQpNotes: (notes: string) => void;
  loading: boolean;
  onQpExpressDirectShipment: () => void;
}

export const QpExpressDirectShipmentCard: React.FC<QpExpressDirectShipmentCardProps> = React.memo(
  ({
    qpSettings,
    qpNotes,
    setQpNotes,
    loading,
    onQpExpressDirectShipment,
  }) => {
    return (
      <div className="p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-900 dark:text-indigo-300">
            إرسال فوري إلى شركة كيو بي إكسبريس (QP Express)
          </span>
          {qpSettings?.customerId ? (
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              عميل رقم: #{qpSettings.customerId}
            </span>
          ) : (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              متصل
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات المعاينة والتسليم للمندوب:
          </label>
          <input
            type="text"
            value={qpNotes}
            onChange={(e) => setQpNotes(e.target.value)}
            placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onQpExpressDirectShipment}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
          >
            <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
            <span>
              {loading
                ? "جاري الإرسال وتوليد البوليصة..."
                : "إرسال إلى كيو بي إكسبريس وتوليد البوليصة"}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

QpExpressDirectShipmentCard.displayName = "QpExpressDirectShipmentCard";
