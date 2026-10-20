import React from "react";
import { TruckIcon } from "@heroicons/react/24/outline";

export interface ManualCourierShipmentCardProps {
  manualTracking: string;
  setManualTracking: (tracking: string) => void;
  manualNotes: string;
  setManualNotes: (notes: string) => void;
  loading: boolean;
  onCreateShipment: () => void;
}

export const ManualCourierShipmentCard: React.FC<ManualCourierShipmentCardProps> = React.memo(
  ({
    manualTracking,
    setManualTracking,
    manualNotes,
    setManualNotes,
    loading,
    onCreateShipment,
  }) => {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              رقم البوليصة أو التتبع (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: EXP-982341"
              value={manualTracking}
              onChange={(e) => setManualTracking(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              اسم المندوب أو ملاحظات التسليم
            </label>
            <input
              type="text"
              placeholder="اسم المندوب ورقم هاتفه"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onCreateShipment}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 active:scale-97"
          >
            <TruckIcon className="h-4 w-4" />
            <span>{loading ? "جاري حفظ الشحنة..." : "حفظ بيانات الشحن اليدوي"}</span>
          </button>
        </div>
      </div>
    );
  }
);

ManualCourierShipmentCard.displayName = "ManualCourierShipmentCard";
