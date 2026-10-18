import React from "react";
import { useTranslation } from "react-i18next";
import {
  TruckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface TurboRecordsTopKpisProps {
  filterType: string;
  totalOrders: number;
  getStatusCount: (key: string) => number;
  onFilterChange: (key: string) => void;
}

export const TurboRecordsTopKpis: React.FC<TurboRecordsTopKpisProps> = ({
  filterType,
  totalOrders,
  getStatusCount,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Active shipments */}
      <button
        onClick={() => onFilterChange("active")}
        className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${
          filterType === "active"
            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-[1.02]"
            : "border-amber-200 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/30"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-800/60 px-2 py-0.5 rounded-md">
            {t("orders.k_42")}
          </span>
          <TruckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-2xl font-black text-amber-900 dark:text-amber-100 font-mono tabular-nums">
          {getStatusCount("active")} {t("orders.k_43")}
        </div>
        <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">
          {t("orders.k_44")}
        </div>
      </button>

      {/* 2. Merchant preparing */}
      <button
        onClick={() => onFilterChange("merchant_preparing")}
        className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${
          filterType === "merchant_preparing"
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-400 scale-[1.02]"
            : "border-indigo-200 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-200/80 dark:bg-indigo-800/60 px-2 py-0.5 rounded-md">
            {t("orders.k_45")}
          </span>
          <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 font-mono tabular-nums">
          {getStatusCount("merchant_preparing")} {t("orders.k_43")}
        </div>
        <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 font-medium">
          {t("orders.k_46")}
        </div>
      </button>

      {/* 3. Branch processing */}
      <button
        onClick={() => onFilterChange("processing")}
        className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${
          filterType === "processing"
            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-400 scale-[1.02]"
            : "border-purple-200 dark:border-purple-700 bg-purple-50/60 dark:bg-purple-900/20 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-200 bg-purple-200/80 dark:bg-purple-800/60 px-2 py-0.5 rounded-md">
            {t("orders.k_47")}
          </span>
          <InformationCircleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="text-2xl font-black text-purple-900 dark:text-purple-100 font-mono tabular-nums">
          {getStatusCount("processing")} {t("orders.k_43")}
        </div>
        <div className="text-xs text-purple-700 dark:text-purple-300 mt-1 font-medium">
          {t("orders.k_48")}
        </div>
      </button>

      {/* 4. Total orders */}
      <button
        onClick={() => onFilterChange("all")}
        className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${
          filterType === "all"
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400 scale-[1.02]"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-800/60 px-2 py-0.5 rounded-md">
            {t("orders.k_49")}
          </span>
          <TruckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tabular-nums">
          {totalOrders} {t("orders.k_43")}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
          {t("orders.k_50")}
        </div>
      </button>
    </div>
  );
};

export default TurboRecordsTopKpis;
