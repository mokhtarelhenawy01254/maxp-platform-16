import React from "react";
import { RefreshCw } from "lucide-react";

interface CustomerSegmentsHeaderProps {
  onRefresh: () => void;
}

export const CustomerSegmentsHeader: React.FC<CustomerSegmentsHeaderProps> = ({ onRefresh }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          مركز تقسيم العملاء
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          إدارة شاملة لتصنيفات العملاء وجودتهم وولائهم
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        تحديث
      </button>
    </div>
  );
};
