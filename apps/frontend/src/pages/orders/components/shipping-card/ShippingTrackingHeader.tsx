/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface ShippingTrackingHeaderProps {
  order: any;
  existingTracking: string;
  existingCarrierName: string;
  isQpExpress: boolean;
  isBosta: boolean;
  isTurbo: boolean;
  onCopyTracking: () => void;
}

export const ShippingTrackingHeader: React.FC<ShippingTrackingHeaderProps> = ({
  order,
  existingTracking,
  existingCarrierName,
  isQpExpress,
  isBosta,
  isTurbo,
  onCopyTracking,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">شركة الشحن</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {existingCarrierName}
          </p>
          {isQpExpress && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              QP API
            </span>
          )}
          {isBosta && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              Bosta API
            </span>
          )}
          {isTurbo && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              Turbo API
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          رقم التتبع (AWB)
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
            {existingTracking}
          </span>
          <button
            type="button"
            onClick={onCopyTracking}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition active:scale-90"
            title="نسخ رقم التتبع"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          قيمة التحصيل (COD)
        </p>
        <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
          {formatPrice(order?.total || 0)}
        </p>
      </div>
    </div>
  );
};
