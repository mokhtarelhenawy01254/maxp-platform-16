export type DashboardDateRange = {
  start: string;
  end: string;
};

export type DashboardPresetRange = {
  id: string;
  label: string;
  range: DashboardDateRange;
};

type TranslateFn = (key: string) => string;

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getInitialDateRange = (): DashboardDateRange => {
  const today = new Date();
  const todayValue = toDateInputValue(today);

  return {
    start: todayValue,
    end: todayValue,
  };
};

export const getPresetRanges = (
  t: TranslateFn,
): DashboardPresetRange[] => {
  const now = new Date();
  const today = toDateInputValue(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 6);

  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    {
      id: "today",
      label: t("companyDashboard.presets.today"),
      range: { start: today, end: today },
    },
    {
      id: "yesterday",
      label: t("companyDashboard.presets.yesterday"),
      range: {
        start: toDateInputValue(yesterdayDate),
        end: toDateInputValue(yesterdayDate),
      },
    },
    {
      id: "last7",
      label: t("companyDashboard.presets.last7Days"),
      range: { start: toDateInputValue(last7Start), end: today },
    },
    {
      id: "last30",
      label: t("companyDashboard.presets.last30Days"),
      range: { start: toDateInputValue(last30Start), end: today },
    },
    {
      id: "thisMonth",
      label: t("companyDashboard.presets.thisMonth"),
      range: { start: toDateInputValue(thisMonthStart), end: today },
    },
    {
      id: "lastMonth",
      label: t("companyDashboard.presets.lastMonth"),
      range: {
        start: toDateInputValue(lastMonthStart),
        end: toDateInputValue(lastMonthEnd),
      },
    },
  ];
};

export const findMatchingPresetRange = (
  dateRange: DashboardDateRange,
  presets: DashboardPresetRange[],
) =>
  presets.find(
    (preset) =>
      preset.range.start === dateRange.start &&
      preset.range.end === dateRange.end,
  ) ?? null;

export const formatDateRangeValue = (value: string, locale: string) => {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const parsedDate = new Date(year, month - 1, day);

  return parsedDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
};

export const getDateRangeDisplayLabel = (
  dateRange: DashboardDateRange,
  presets: DashboardPresetRange[],
  locale: string,
) => {
  const matchingPreset = findMatchingPresetRange(dateRange, presets);
  if (matchingPreset) {
    return matchingPreset.label;
  }

  const formattedStart = formatDateRangeValue(dateRange.start, locale);
  const formattedEnd = formatDateRangeValue(dateRange.end, locale);

  if (formattedStart === formattedEnd) {
    return formattedStart;
  }

  return `${formattedStart} - ${formattedEnd}`;
};
