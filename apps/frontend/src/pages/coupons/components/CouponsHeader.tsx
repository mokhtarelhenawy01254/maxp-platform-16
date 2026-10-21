import React from "react";
import { useTranslation } from "react-i18next";
import { TicketIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface CouponsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onCreateOpen: () => void;
}

export const CouponsHeader: React.FC<CouponsHeaderProps> = ({
  loading,
  onRefresh,
  onCreateOpen,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl flex items-center gap-2">
          <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          {t("coupons.pageTitle")}
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          {t("coupons.pageDescription")}
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          onClick={onRefresh}
          title="تحديث البيانات"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          تحديث
        </button>
        <button
          onClick={onCreateOpen}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-xs active:scale-[0.98] transition-all"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t("coupons.newCoupon")}
        </button>
      </div>
    </div>
  );
};
