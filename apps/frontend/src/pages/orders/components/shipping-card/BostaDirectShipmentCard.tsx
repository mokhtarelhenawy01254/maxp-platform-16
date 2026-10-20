import React from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export interface BostaDirectShipmentCardProps {
  loading: boolean;
  onBostaDirectShipment: () => void;
}

export const BostaDirectShipmentCard: React.FC<BostaDirectShipmentCardProps> = React.memo(
  ({ loading, onBostaDirectShipment }) => {
    return (
      <div className="p-3.5 rounded-lg border border-amber-100 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-amber-900 dark:text-amber-300">
            إرسال فوري إلى شركة بوستا (Bosta)
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            مفتاح الـ API مسجل
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          سيتم إرسال عنوان العميل، المحافظة، والمنتجات، ومبلغ التحصيل فوراً لتوليد بوليصة بوستا الرسمية (AWB).
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={onBostaDirectShipment}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
          >
            <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
            <span>
              {loading
                ? "جاري الإرسال وتوليد البوليصة..."
                : "إرسال إلى بوستا وتوليد البوليصة"}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

BostaDirectShipmentCard.displayName = "BostaDirectShipmentCard";
