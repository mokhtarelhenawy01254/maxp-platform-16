import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { dateCls } from "../../types/reportsTypes";

export interface TechnicianProductivityFiltersProps {
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onRefresh: () => void;
}

export const TechnicianProductivityFilters: React.FC<TechnicianProductivityFiltersProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("dentalLab.reports.from")}
          </label>
          <input
            className={dateCls}
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("dentalLab.reports.to")}
          </label>
          <input
            className={dateCls}
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          {t("dentalLab.common.refresh")}
        </button>
      </div>
    </div>
  );
};

export default TechnicianProductivityFilters;
