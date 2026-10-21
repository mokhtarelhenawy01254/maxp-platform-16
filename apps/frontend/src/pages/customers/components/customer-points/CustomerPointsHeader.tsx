import React from "react";
import { UserPlus, RefreshCw } from "lucide-react";

interface CustomerPointsHeaderProps {
  onOpenEnroll: () => void;
  onRefresh: () => void;
}

export const CustomerPointsHeader: React.FC<CustomerPointsHeaderProps> = ({
  onOpenEnroll,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          مركز نقاط العملاء
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          لوحة شاملة لنقاط العملاء ومستوياتهم وحملات حفظ الولاء.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenEnroll}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          إضافة عميل
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          title="تحديث"
          aria-label="تحديث"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
