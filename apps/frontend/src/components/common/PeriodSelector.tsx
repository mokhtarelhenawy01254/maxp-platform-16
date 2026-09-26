import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type PeriodKey =
  | "today"
  | "yesterday"
  | "7"
  | "30"
  | "90"
  | "180"
  | "365"
  | "custom";

export interface PeriodRange {
  period: PeriodKey;
  startDate: string;
  endDate: string;
}

const PRESET_OPTIONS: {
  key: Exclude<PeriodKey, "custom">;
  labelKey: string;
}[] = [
  { key: "today", labelKey: "periodSelector.today" },
  { key: "yesterday", labelKey: "periodSelector.yesterday" },
  { key: "7", labelKey: "periodSelector.last7Days" },
  { key: "30", labelKey: "periodSelector.last30Days" },
  { key: "90", labelKey: "periodSelector.last90Days" },
  { key: "180", labelKey: "periodSelector.last6Months" },
  { key: "365", labelKey: "periodSelector.lastYear" },
];

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const computePeriodRange = (
  key: Exclude<PeriodKey, "custom">,
): { startDate: string; endDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date();
  let start: Date;

  switch (key) {
    case "today":
      start = today;
      break;
    case "yesterday":
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { startDate: toISODate(start), endDate: toISODate(start) };
    case "7":
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case "30":
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case "90":
      start = new Date(today);
      start.setDate(start.getDate() - 89);
      break;
    case "180":
      start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      break;
    case "365":
      start = new Date(today);
      start.setDate(start.getDate() - 364);
      break;
  }

  return { startDate: toISODate(start), endDate: toISODate(end) };
};

interface PeriodSelectorProps {
  initialPeriod?: PeriodKey;
  initialStartDate?: string;
  initialEndDate?: string;
  onRangeChange?: (range: PeriodRange) => void;
  onChange?: (range: PeriodRange) => void;
  className?: string;
  inputClassName?: string;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  initialPeriod = "30",
  initialStartDate = "",
  initialEndDate = "",
  onRangeChange,
  onChange,
  className,
  inputClassName,
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [customStart, setCustomStart] = useState(initialStartDate);
  const [customEnd, setCustomEnd] = useState(initialEndDate);

  const notifyChange = (newRange: PeriodRange) => {
    if (typeof onRangeChange === "function") {
      onRangeChange(newRange);
    }
    if (typeof onChange === "function") {
      onChange(newRange);
    }
  };

  useEffect(() => {
    if (period === "custom") {
      if (customStart && customEnd) {
        notifyChange({ period, startDate: customStart, endDate: customEnd });
      }
      return;
    }
    notifyChange({
      period,
      ...computePeriodRange(period),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const handleCustomChange = (field: "start" | "end", value: string) => {
    if (period !== "custom") {
      setPeriod("custom");
    }
    if (field === "start") {
      setCustomStart(value);
    } else {
      setCustomEnd(value);
    }
  };

  const baseInput =
    inputClassName ??
    "px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none";

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 text-sm rounded-md border transition ${
              period === key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPeriod("custom")}
          className={`px-3 py-1.5 text-sm rounded-md border transition ${
            period === "custom"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          {t("periodSelector.custom")}
        </button>
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => handleCustomChange("start", e.target.value)}
            className={baseInput}
            aria-label={t("periodSelector.from") as string}
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {t("periodSelector.to")}
          </span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => handleCustomChange("end", e.target.value)}
            className={baseInput}
            aria-label={t("periodSelector.to") as string}
          />
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
