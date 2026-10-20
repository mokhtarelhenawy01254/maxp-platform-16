import React from "react";
import { CalendarClock, X as XMarkIcon } from "lucide-react";

interface SettlementHeaderProps {
  period: string;
  onClose: () => void;
}

export const SettlementHeader: React.FC<SettlementHeaderProps> = ({
  period,
  onClose,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between pb-3 border-b dark:border-gray-800 mb-3 gap-2">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>تقفيل المستحقات الشهرية وتجميد الأرصدة</span>
            <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900 font-mono tabular-nums">
              {period}
            </span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            تسوية فواتير ومسددات الشهر لكل طبيب، ترحيل رصيد أول المدة، وتجميد
            الحسابات للتدقيق المحاسبي
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
        aria-label="إغلاق"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default SettlementHeader;
