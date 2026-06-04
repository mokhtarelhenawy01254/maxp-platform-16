export const DASHBOARD_CACHE_TTL_MS = 60 * 1000;

import type { BusinessMetricTone } from "../../components/business/BusinessMetrics";

export const toneMap = {
  blue: "primary",
  purple: "secondary",
  orange: "warning",
  green: "success",
} as const satisfies Record<
  "blue" | "purple" | "orange" | "green",
  BusinessMetricTone
>;

export const DASHBOARD_SECTION_KEYS = [
  "companyDashboard.financials",
  "companyDashboard.rangeStats",
  "companyDashboard.operations",
] as const;
