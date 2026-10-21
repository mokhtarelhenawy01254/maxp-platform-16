import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

interface CustomerListHeaderProps {
  totalCount: number;
  availableDiscountCount: number | null;
  isAdmin: boolean;
  onImportClick: () => void;
  onExportClick: (format: "csv" | "json") => void;
}

export const CustomerListHeader: React.FC<CustomerListHeaderProps> = ({
  totalCount,
  availableDiscountCount,
  isAdmin,
  onImportClick,
  onExportClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("customers.pageTitle")}
          </h1>
          {totalCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-xs font-mono font-medium tabular-nums shadow-2xs">
              {totalCount} عميل
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t("customers.pageSubtitle")}
        </p>
        {availableDiscountCount !== null && availableDiscountCount > 0 && (
          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 tabular-nums shadow-2xs">
            <TagIcon className="h-3 w-3" />
            <span>{availableDiscountCount} عميل مؤهل لخصم تلقائي</span>
          </span>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onImportClick}
            className="inline-flex items-center px-3 py-1.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.97] shadow-2xs"
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5 ml-1.5 text-zinc-400" />
            {t("customers.importCSV")}
          </button>
          <button
            onClick={() => onExportClick("csv")}
            className="inline-flex items-center px-3 py-1.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.97] shadow-2xs"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5 ml-1.5 text-zinc-400" />
            {t("customers.exportCSV")}
          </button>

          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-150 active:scale-[0.97]"
          >
            <PlusIcon className="h-3.5 w-3.5 text-white dark:text-zinc-950" />
            <span>{t("customers.addCustomer")}</span>
          </Link>
        </div>
      )}
    </div>
  );
};
