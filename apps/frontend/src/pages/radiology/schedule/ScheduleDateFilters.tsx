import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { MODAL_INPUT_CLS } from "../shared";
import { dayKey, addDays } from "../ScheduleCalendar";
import { todayKey } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface ScheduleDateFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  loadError: string | null;
  onRetry: () => void;
}

export const ScheduleDateFilters: React.FC<ScheduleDateFiltersProps> = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  loadError,
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          {t("radiology.schedule.from")}
        </label>
        <DateInput
          className={MODAL_INPUT_CLS}
          style={{ width: 160 }}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
        <label className="text-sm text-gray-600 dark:text-gray-300">
          {t("radiology.schedule.to")}
        </label>
        <DateInput
          className={MODAL_INPUT_CLS}
          style={{ width: 160 }}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const yest = dayKey(addDays(new Date(), -1));
              onDateFromChange(yest);
              onDateToChange(yest);
            }}
            className="px-2.5 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t("radiology.schedule.quickYesterday")}
          </button>
          <button
            onClick={() => {
              onDateFromChange(dayKey(addDays(new Date(), -6)));
              onDateToChange(todayKey());
            }}
            className="px-2.5 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t("radiology.schedule.quick7Days")}
          </button>
          <button
            onClick={() => {
              onDateFromChange(dayKey(addDays(new Date(), -29)));
              onDateToChange(todayKey());
            }}
            className="px-2.5 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t("radiology.schedule.quick30Days")}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
          <span>{loadError}</span>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("radiology.schedule.retry")}
          </button>
        </div>
      )}
    </>
  );
};
