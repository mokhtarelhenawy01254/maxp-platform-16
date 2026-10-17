import React from "react";

export interface DailyAnalytic {
  date: string;
  totalPurchases: number;
  totalRevenue: number;
  totalVisits?: number;
  conversionRate?: number;
  averageOrderValue?: number;
  validPurchases?: number;
  invalidPurchases?: number;
}

export const PRESET_PERIODS = [
  { value: "7", labelKey: "overviewP7" },
  { value: "14", labelKey: "overviewP14" },
  { value: "30", labelKey: "overviewP30" },
  { value: "90", labelKey: "overviewP90" },
  { value: "365", labelKey: "overviewP365" },
  { value: "custom", labelKey: "overviewCustom" },
] as const;

export const PERIOD_STORAGE_KEY = "orders-overview-period";

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const sumBy = (rows: DailyAnalytic[], pick: (r: DailyAnalytic) => number) =>
  rows.reduce((sum, r) => sum + pick(r), 0);

export const pctDelta = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};
