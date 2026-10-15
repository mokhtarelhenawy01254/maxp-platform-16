import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";

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

export const PRESET_OPTIONS: {
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

export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const computePeriodRange = (
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

export const getPeriodLabel = (
  period: PeriodKey,
  t: (key: string, fallback?: string) => string,
): string => {
  switch (period) {
    case "today":
      return t("periodSelector.today", "اليوم");
    case "yesterday":
      return t("periodSelector.yesterday", "أمس");
    case "7":
      return t("periodSelector.last7Days", "آخر 7 أيام");
    case "30":
      return t("periodSelector.last30Days", "آخر 30 يوم");
    case "90":
      return t("periodSelector.last90Days", "آخر 90 يوم");
    case "180":
      return t("periodSelector.last6Months", "آخر 6 شهور");
    case "365":
      return t("periodSelector.lastYear", "آخر سنة");
    case "custom":
      return t("periodSelector.custom", "فترة مخصصة");
    default:
      return period;
  }
};

export const formatPeriodDisplay = (
  range: PeriodRange | null,
  t: (key: string, fallback?: string) => string,
): { label: string; dateRangeText: string } => {
  if (!range) return { label: "", dateRangeText: "" };
  const label = getPeriodLabel(range.period, t);
  let dateRangeText = "";
  if (range.startDate && range.endDate) {
    if (range.startDate === range.endDate) {
      dateRangeText = range.startDate;
    } else {
      dateRangeText = `${range.startDate} → ${range.endDate}`;
    }
  }
  return { label, dateRangeText };
};

export interface PeriodSelectorProps {
  initialPeriod?: PeriodKey;
  initialStartDate?: string;
  initialEndDate?: string;
  onRangeChange?: (range: PeriodRange) => void;
  onChange?: (range: PeriodRange) => void;
  onValidityChange?: (isValid: boolean) => void;
  className?: string;
  inputClassName?: string;
  showAppliedBadge?: boolean;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  initialPeriod = "30",
  initialStartDate = "",
  initialEndDate = "",
  onRangeChange,
  onChange,
  onValidityChange,
  className,
  inputClassName,
  showAppliedBadge = false,
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [customStart, setCustomStart] = useState(initialStartDate);
  const [customEnd, setCustomEnd] = useState(initialEndDate);

  useEffect(() => {
    if (initialPeriod && initialPeriod !== period) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialStartDate !== undefined && initialStartDate !== customStart) {
      setCustomStart(initialStartDate);
    }
  }, [initialStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialEndDate !== undefined && initialEndDate !== customEnd) {
      setCustomEnd(initialEndDate);
    }
  }, [initialEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  let validationError: string | null = null;
  let validationType: "warning" | "error" | null = null;
  let isValid = true;

  if (period === "custom") {
    if (!customStart && !customEnd) {
      validationError = t(
        "periodSelector.selectBothDatesPrompt",
        "يرجى تحديد تاريخ البداية وتاريخ النهاية",
      );
      validationType = "warning";
      isValid = false;
    } else if (!customStart || !customEnd) {
      validationError = t(
        "periodSelector.selectBothDatesWarning",
        "يرجى اختيار التاريخين معاً لتطبيق الفلتر",
      );
      validationType = "warning";
      isValid = false;
    } else if (customStart > customEnd) {
      validationError = t(
        "periodSelector.startDateAfterEndDate",
        "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية",
      );
      validationType = "error";
      isValid = false;
    }
  }

  const notifyChange = (newRange: PeriodRange) => {
    if (typeof onRangeChange === "function") {
      onRangeChange(newRange);
    }
    if (typeof onChange === "function") {
      onChange(newRange);
    }
  };

  useEffect(() => {
    if (typeof onValidityChange === "function") {
      onValidityChange(isValid);
    }

    if (period === "custom") {
      if (customStart && customEnd && customStart <= customEnd) {
        notifyChange({ period, startDate: customStart, endDate: customEnd });
      }
      return;
    }

    notifyChange({
      period,
      ...computePeriodRange(period),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd, isValid]);

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
    "px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-foreground font-mono tabular-nums text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition";

  const appliedLabel = getPeriodLabel(period, t);
  const activeRangeDates =
    period === "custom"
      ? { startDate: customStart, endDate: customEnd }
      : computePeriodRange(period as Exclude<PeriodKey, "custom">);

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESET_OPTIONS.map(({ key, labelKey }) => {
          const isActive = period === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 active:scale-95 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-card text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(labelKey)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPeriod("custom")}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 active:scale-95 ${
            period === "custom"
              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
              : "bg-card text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
          }`}
        >
          {t("periodSelector.custom", "فترة مخصصة")}
        </button>
      </div>

      {period === "custom" && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {t("periodSelector.from", "من")}:
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => handleCustomChange("start", e.target.value)}
                className={`${baseInput} ${
                  validationError
                    ? validationType === "error"
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-amber-500/50 focus:border-amber-500"
                    : ""
                }`}
                aria-label={t("periodSelector.from", "من") as string}
                aria-invalid={!isValid}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {t("periodSelector.to", "إلى")}:
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => handleCustomChange("end", e.target.value)}
                className={`${baseInput} ${
                  validationError
                    ? validationType === "error"
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-amber-500/50 focus:border-amber-500"
                    : ""
                }`}
                aria-label={t("periodSelector.to", "إلى") as string}
                aria-invalid={!isValid}
              />
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                validationType === "error"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              }`}
            >
              {validationType === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              )}
              <span>{validationError}</span>
            </div>
          )}
        </div>
      )}

      {showAppliedBadge && isValid && (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{t("periodSelector.appliedPeriod", "الفترة المطبقة")}:</span>
          <span className="font-semibold text-foreground">
            {appliedLabel}
          </span>
          {activeRangeDates.startDate && activeRangeDates.endDate && (
            <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
              {activeRangeDates.startDate === activeRangeDates.endDate
                ? `(${activeRangeDates.startDate})`
                : `(${activeRangeDates.startDate} → ${activeRangeDates.endDate})`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
