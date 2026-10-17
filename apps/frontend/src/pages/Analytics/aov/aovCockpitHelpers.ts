import {
  QuantityOfferUsageFeatureTotals,
} from "../../marketplace/quantityOfferInsights";
import { AovToolDefinition } from "./aovToolsCatalog";

/**
 * Pure helpers for the AOV Growth Cockpit. No side effects, no browser/runtime
 * dependencies — safe to unit-test and to import from any environment.

 */

export interface PostPurchaseAnalyticsData {
  totalOrders: number;
  offerAccepts: number;
  acceptanceRate: number;
  offerRevenue: number;
  aovImpact: number;
}

export interface ManagedAppRecord {
  id: string;
  active: boolean;
  settings?: Record<string, unknown>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const toNum = (v: unknown) => Number(v || 0);

/**
 * Normalizes the real contract of POST /post-purchase-offer/analytics
 * (`data.kpis.*` — offerAcceptedOrders / offerAcceptsCount / offerRevenue /
 * aovLiftAmount) while staying backward compatible with a flat legacy shape.
 */
export const mapPostPurchaseAnalytics = (
  payload: unknown,
): PostPurchaseAnalyticsData | null => {
  if (!isRecord(payload)) return null;
  const kpis = isRecord(payload.kpis) ? payload.kpis : payload;
  return {
    totalOrders: toNum(kpis.totalOrders ?? kpis.totalOrdersCount),
    offerAccepts: toNum(
      kpis.offerAccepts ?? kpis.offerAcceptsCount ?? kpis.offerAcceptedOrders,
    ),
    acceptanceRate: toNum(kpis.acceptanceRate),
    offerRevenue: toNum(kpis.offerRevenue),
    aovImpact: toNum(kpis.aovLiftAmount ?? kpis.aovImpact),
  };
};

/** Real activation truth from GET /my-apps rows (status + isExpired). */
export const isManagedAppActive = (ca: unknown): boolean => {
  if (!ca || typeof ca !== "object") return false;
  const row = ca as { isExpired?: unknown; status?: unknown };
  return (
    !row.isExpired &&
    ["ACTIVE", "active", "TRIAL", "trial"].includes(String(row.status || ""))
  );
};

/**
 * Module-level truth wins; otherwise an active app means its ungoverned
 * modules are on. Apps that are missing/expired fall back to defaultActive.
 */
export const resolveToolActive = (
  tool: Pick<AovToolDefinition, "appSlug" | "moduleKey" | "defaultActive">,
  app?: ManagedAppRecord,
): boolean => {
  if (!tool.appSlug) return tool.defaultActive ?? false;
  if (!app || !app.active) return tool.defaultActive ?? false;
  const modules =
    isRecord(app.settings) && isRecord(app.settings.modules)
      ? app.settings.modules
      : undefined;
  const moduleVal = tool.moduleKey && modules ? modules[tool.moduleKey] : undefined;
  if (typeof moduleVal === "boolean") return moduleVal;
  return true;
};

export const buildConversionUsageMap = (
  byFeature: unknown,
): Record<string, number> => {
  const countMap: Record<string, number> = {};
  if (Array.isArray(byFeature)) {
    byFeature.forEach((f: any) => {
      if (f?.feature) countMap[f.feature] = toNum(f._count?.id);
    });
  }
  return countMap;
};

export const buildQuantityFeatureMap = (
  byFeature: unknown,
): Record<string, QuantityOfferUsageFeatureTotals> => {
  const featureMap: Record<string, QuantityOfferUsageFeatureTotals> = {};
  if (Array.isArray(byFeature)) {
    byFeature.forEach((f: any) => {
      if (f?.feature) {
        featureMap[f.feature] = {
          actions: toNum(f._count?.id),
          quantity: toNum(f._sum?.quantity),
          totalCost: toNum(f._sum?.totalCost),
        };
      }
    });
  }
  return featureMap;
};

// ---------- Cairo (Africa/Cairo) day bounds, DST-safe ----------
const CAIRO_TZ = "Africa/Cairo";

const cairoOffsetMinutes = (d: Date): number => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const get = (type: string) =>
    Number(dtf.formatToParts(d).find((p) => p.type === type)?.value || 0);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  // Round to whole minutes: formatToParts drops milliseconds, which would
  // otherwise skew the offset (e.g. 179.98 min) near .999ms boundaries.
  return Math.round((asUTC - d.getTime()) / 60000);
};

const cairoDayBound = (dateStr: string, endOfDay: boolean): Date => {
  const base = new Date(
    `${dateStr}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  ).getTime();
  const guessOffset = cairoOffsetMinutes(new Date(base));
  const instant = base - guessOffset * 60000;
  const offsetAtInstant = cairoOffsetMinutes(new Date(instant));
  return new Date(
    guessOffset === offsetAtInstant ? instant : base - offsetAtInstant * 60000,
  );
};

export type AovCockpitPeriod = "today" | "yesterday" | "7" | "30";

/** ISO date boundaries of the selected period in Cairo local time. */
export const getPeriodDateRange = (period: AovCockpitPeriod) => {
  const now = new Date();
  const cairoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CAIRO_TZ });
  const todayStr = cairoFmt.format(now);

  let startStr = todayStr;
  let endStr = todayStr;
  if (period === "yesterday") {
    startStr = cairoFmt.format(new Date(now.getTime() - 86400000));
    endStr = startStr;
  } else if (period === "7" || period === "30") {
    startStr = cairoFmt.format(
      new Date(now.getTime() - Number(period) * 86400000),
    );
  }

  return {
    startDate: cairoDayBound(startStr, false).toISOString(),
    endDate: cairoDayBound(endStr, true).toISOString(),
  };
};
