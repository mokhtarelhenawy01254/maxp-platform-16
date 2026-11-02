import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { RadiologyReportStatusMap } from "../shared";
import { ReportFilters } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface RadiologyReportsFilterBarProps {
  filters: ReportFilters;
  updateFilter: (key: keyof ReportFilters, value: string) => void;
  refreshing: boolean;
}

export const RadiologyReportsFilterBar: React.FC<RadiologyReportsFilterBarProps> = ({
  filters,
  updateFilter,
  refreshing,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 cursor-pointer"
        value={filters.statusFilter}
        onChange={(e) => updateFilter("statusFilter", e.target.value)}
      >
        <option value="">{t("radiology.reports.allStatuses")}</option>
        {Object.entries(RadiologyReportStatusMap).map(([k, v]) => (
          <option key={k} value={k}>
            {t(v.label)}
          </option>
        ))}
      </select>

      <select
        className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 cursor-pointer"
        value={filters.criticalFilter}
        onChange={(e) => updateFilter("criticalFilter", e.target.value)}
      >
        <option value="">{t("radiology.reports.allReports")}</option>
        <option value="CRITICAL">{t("radiology.critical.criticalList")}</option>
        <option value="NONE">{t("radiology.critical.none")}</option>
      </select>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          className="border dark:border-gray-600 rounded-lg pr-9 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 w-52"
          placeholder={t("radiology.reports.searchByPatient") as string}
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>

      <input
        className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100"
        dir="ltr"
        placeholder={t("radiology.reports.studyNumber") as string}
        value={filters.studySearch}
        onChange={(e) => updateFilter("studySearch", e.target.value)}
      />

      <DateInput
        className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100"
        value={filters.dateFrom}
        onChange={(e) => updateFilter("dateFrom", e.target.value)}
      />

      <DateInput
        className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100"
        value={filters.dateTo}
        onChange={(e) => updateFilter("dateTo", e.target.value)}
      />

      {refreshing ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : null}
    </div>
  );
};
