import React from "react";
import { TruckIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface TurboDirectShipmentCardProps {
  orderTotal: number;
  loading: boolean;
  onTurboDirectShipment: () => void;
}

export const TurboDirectShipmentCard: React.FC<TurboDirectShipmentCardProps> = React.memo(
  ({ orderTotal, loading, onTurboDirectShipment }) => {
    const { formatPrice } = useCurrency();

    return (
      <div className="p-3.5 rounded-lg border border-blue-100 dark:border-blue-950/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <TruckIcon className="h-4 w-4 text-blue-600" />
            إرسال فوري إلى شركة تربو (Turbo Courier)
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            الحساب مفعل وجاهز
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          سيتم إرسال بيانات العميل والمنتجات ومبلغ التحصيل (
          <span className="font-mono tabular-nums font-semibold">
            {formatPrice(orderTotal)}
          </span>
          ) فوراً إلى حسابك لدى تربو وتوليد رقم التتبع وبوليصة الشحن.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={onTurboDirectShipment}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
          >
            <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
            <span>
              {loading
                ? "جاري الإرسال لتربو وتوليد البوليصة..."
                : "إرسال إلى شركة تربو وتوليد البوليصة"}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

TurboDirectShipmentCard.displayName = "TurboDirectShipmentCard";
