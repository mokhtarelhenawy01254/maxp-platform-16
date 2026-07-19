import type { AsyncReportData } from "../../services/facebookAdsService";

export type ReportLevel = NonNullable<AsyncReportData["level"]>;
export type DateMode = "preset" | "range";

export type AsyncReportStatus = {
  success?: boolean;
  status?: string | null;
  percentComplete?: number | null;
  errorCode?: string | number | null;
  errorMessage?: string | null;
  errorSubcode?: string | number | null;
  data?: Record<string, unknown> | null;
  error?: string | null;
};

export type AsyncReportResults = {
  success?: boolean;
  data?: Array<Record<string, unknown>>;
  paging?: unknown;
  error?: string | null;
};

export const extractReportRunId = (response: unknown) => {
  const value = response as {
    reportRunId?: string;
    report_run_id?: string;
    data?: { report_run_id?: string; id?: string };
    id?: string;
  };
  return (
    value.reportRunId ||
    value.report_run_id ||
    value.data?.report_run_id ||
    value.data?.id ||
    value.id ||
    ""
  );
};

export const normalizeAsyncReportStatus = (
  response: unknown,
): AsyncReportStatus => {
  const value = (response || {}) as AsyncReportStatus & {
    async_status?: string;
    async_percent_completion?: number;
    error_code?: string | number | null;
    error_message?: string | null;
    error_subcode?: string | number | null;
  };
  const data = (value.data || {}) as Record<string, unknown>;

  return {
    ...value,
    status:
      value.status ||
      value.async_status ||
      (data.async_status as string | undefined) ||
      null,
    percentComplete:
      value.percentComplete ??
      value.async_percent_completion ??
      (data.async_percent_completion as number | undefined) ??
      null,
    errorCode:
      value.errorCode ??
      value.error_code ??
      (data.error_code as string | number | null | undefined) ??
      null,
    errorMessage:
      value.errorMessage ??
      value.error_message ??
      (data.error_message as string | null | undefined) ??
      value.error ??
      null,
    errorSubcode:
      value.errorSubcode ??
      value.error_subcode ??
      (data.error_subcode as string | number | null | undefined) ??
      null,
    data,
  };
};

export const buildAsyncReportPayload = ({
  adAccountId,
  level,
  dateMode,
  datePreset,
  since,
  until,
  fields,
  breakdowns,
}: {
  adAccountId?: string;
  level: ReportLevel;
  dateMode: DateMode;
  datePreset: string;
  since: string;
  until: string;
  fields: string[];
  breakdowns: string[];
}): AsyncReportData => ({
  adAccountId: adAccountId || undefined,
  level,
  fields,
  breakdowns,
  ...(dateMode === "range" && since && until
    ? { timeRange: { since, until } }
    : { datePreset }),
});
