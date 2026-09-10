import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Loader2,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import FacebookAdsAccountContextPanel from "../../components/advertising/FacebookAdsAccountContextPanel";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookPerformanceBreakdown,
  type FacebookPerformanceBreakdownReport,
  facebookAdsService,
} from "../../services/facebookAdsService";
import { formatCurrency, formatNumber } from "../../utils/facebookAdsHelpers";
import {
  type AsyncReportResults,
  type AsyncReportStatus,
  type DateMode,
  type ReportLevel,
  buildAsyncReportPayload,
  extractReportRunId,
  normalizeAsyncReportStatus,
} from "./MediaBuyingReports.helpers";

type ReportMode = "async" | "sync";
type AsyncRunState = {
  reportRunId: string;
  status: AsyncReportStatus | null;
  results: AsyncReportResults | null;
  createdAt: string;
};

const reportLevels: Array<{ value: ReportLevel; label: string; hint: string }> = [
  { value: "account", label: "Account", hint: "إجمالي الحساب" },
  { value: "campaign", label: "Campaign", hint: "قرارات الميزانية" },
  { value: "adset", label: "Ad Set", hint: "الجمهور والمواضع" },
  { value: "ad", label: "Ad", hint: "الكريتيف والرسالة" },
];

const datePresets = [
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "last_7d", label: "آخر 7 أيام" },
  { value: "last_14d", label: "آخر 14 يوم" },
  { value: "last_30d", label: "آخر 30 يوم" },
  { value: "this_month", label: "هذا الشهر" },
  { value: "last_month", label: "الشهر السابق" },
  { value: "maximum", label: "كل المتاح" },
];

const fieldOptions = [
  { value: "campaign_id", label: "Campaign ID", levels: ["campaign", "adset", "ad"] },
  { value: "campaign_name", label: "Campaign", levels: ["campaign", "adset", "ad"] },
  { value: "adset_id", label: "Ad Set ID", levels: ["adset", "ad"] },
  { value: "adset_name", label: "Ad Set", levels: ["adset", "ad"] },
  { value: "ad_id", label: "Ad ID", levels: ["ad"] },
  { value: "ad_name", label: "Ad", levels: ["ad"] },
  { value: "impressions", label: "Impressions" },
  { value: "reach", label: "Reach" },
  { value: "frequency", label: "Frequency" },
  { value: "clicks", label: "Clicks" },
  { value: "inline_link_clicks", label: "Link clicks" },
  { value: "ctr", label: "CTR" },
  { value: "cpc", label: "CPC" },
  { value: "cpm", label: "CPM" },
  { value: "spend", label: "Spend" },
  { value: "actions", label: "Actions" },
  { value: "cost_per_action_type", label: "Cost/action" },
  { value: "purchase_roas", label: "Purchase ROAS" },
];

const defaultFields = [
  "campaign_name",
  "adset_name",
  "ad_name",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "inline_link_clicks",
  "ctr",
  "cpc",
  "spend",
  "actions",
  "cost_per_action_type",
];

const breakdownOptions = [
  { value: "age", label: "Age", sync: "age_gender" },
  { value: "gender", label: "Gender", sync: "age_gender" },
  { value: "country", label: "Country", sync: "country" },
  { value: "region", label: "Region", sync: "region" },
  { value: "publisher_platform", label: "Publisher platform", sync: "placement" },
  { value: "platform_position", label: "Placement", sync: "placement" },
  { value: "device_platform", label: "Device", sync: "device" },
] as const;

const syncBreakdownOptions: Array<{
  value: FacebookPerformanceBreakdown;
  label: string;
}> = [
  { value: "age_gender", label: "العمر والجنس" },
  { value: "placement", label: "الموضع والمنصة" },
  { value: "platform", label: "المنصة" },
  { value: "device", label: "الجهاز" },
  { value: "country", label: "الدولة" },
  { value: "region", label: "المحافظة" },
];

const statusLabels: Record<string, string> = {
  "Job Not Started": "لم يبدأ",
  "Job Started": "بدأ",
  "Job Running": "قيد التشغيل",
  "Job Completed": "اكتمل",
  "Job Failed": "فشل",
  "Job Skipped": "تم تخطيه",
};

const isTerminalStatus = (status?: string | null) =>
  status === "Job Completed" || status === "Job Failed" || status === "Job Skipped";

const getCellValue = (row: Record<string, unknown>, field: string) => {
  const value = row[field];
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return value == null || value === "" ? "-" : String(value);
};

const downloadCsv = (rows: Record<string, unknown>[], fields: string[]) => {
  const header = fields.join(",");
  const body = rows
    .map((row) =>
      fields
        .map((field) => `"${getCellValue(row, field).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([[header, body].filter(Boolean).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meta-ads-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

const MediaBuyingReports: React.FC = () => {
  const accountContext = useFacebookAdsAccountContext();
  const { selectedAdAccountId, selectedAdAccount } = accountContext;
  const [mode, setMode] = useState<ReportMode>("async");
  const [level, setLevel] = useState<ReportLevel>("ad");
  const [dateMode, setDateMode] = useState<DateMode>("preset");
  const [datePreset, setDatePreset] = useState("last_30d");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [fields, setFields] = useState<string[]>(defaultFields);
  const [breakdowns, setBreakdowns] = useState<string[]>([
    "publisher_platform",
    "platform_position",
  ]);
  const [syncBreakdown, setSyncBreakdown] =
    useState<FacebookPerformanceBreakdown>("placement");
  const [running, setRunning] = useState(false);
  const [polling, setPolling] = useState(false);
  const [asyncRun, setAsyncRun] = useState<AsyncRunState | null>(null);
  const [syncReport, setSyncReport] =
    useState<FacebookPerformanceBreakdownReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleFields = useMemo(
    () =>
      fieldOptions.filter(
        (field) => !field.levels || field.levels.includes(level),
      ),
    [level],
  );
  const resultRows = asyncRun?.results?.data || [];
  const tableFields = useMemo(() => {
    const keysFromRows = Array.from(
      new Set(resultRows.flatMap((row) => Object.keys(row))),
    );
    return fields.filter((field) => keysFromRows.includes(field)).length > 0
      ? fields.filter((field) => keysFromRows.includes(field))
      : keysFromRows.slice(0, 10);
  }, [fields, resultRows]);
  const activeStatus = asyncRun?.status;
  const statusText =
    activeStatus?.status && statusLabels[activeStatus.status]
      ? statusLabels[activeStatus.status]
      : activeStatus?.status || "لم يتم التشغيل";
  const statusHasV25Error =
    activeStatus?.errorCode ||
    activeStatus?.errorMessage ||
    activeStatus?.errorSubcode;

  const toggleField = (field: string) => {
    setFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    );
  };

  const toggleBreakdown = (breakdown: string) => {
    setBreakdowns((current) =>
      current.includes(breakdown)
        ? current.filter((item) => item !== breakdown)
        : [...current, breakdown],
    );
  };

  const fetchStatus = async (reportRunId = asyncRun?.reportRunId) => {
    if (!reportRunId) {
      return null;
    }

    const response = await facebookAdsService.getAsyncReportStatus(
      reportRunId,
      selectedAdAccountId,
    );
    const normalized = normalizeAsyncReportStatus(response);
    setAsyncRun((current) =>
      current && current.reportRunId === reportRunId
        ? { ...current, status: normalized }
        : current,
    );
    return normalized;
  };

  const fetchResults = async (reportRunId = asyncRun?.reportRunId) => {
    if (!reportRunId) {
      return;
    }

    const response = (await facebookAdsService.getAsyncReportResults(
      reportRunId,
      selectedAdAccountId,
    )) as AsyncReportResults;
    setAsyncRun((current) =>
      current && current.reportRunId === reportRunId
        ? { ...current, results: response }
        : current,
    );
  };

  useEffect(() => {
    if (!polling || !asyncRun?.reportRunId) {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const nextStatus = await fetchStatus(asyncRun.reportRunId);
        if (nextStatus?.status === "Job Completed") {
          await fetchResults(asyncRun.reportRunId);
          setPolling(false);
        } else if (isTerminalStatus(nextStatus?.status)) {
          setPolling(false);
        }
      } catch (pollError: any) {
        setPolling(false);
        setError(
          pollError?.response?.data?.error ||
            pollError?.message ||
            "فشل تحديث حالة التقرير",
        );
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [asyncRun?.reportRunId, polling, selectedAdAccountId]);

  const runAsyncReport = async () => {
    if (!fields.length) {
      tToast.error("MediaBuyingReports.msg_dd34");
      return;
    }

    if (dateMode === "range" && (!since || !until)) {
      tToast.error("MediaBuyingReports.msg_c2d1");
      return;
    }

    const payload = buildAsyncReportPayload({
      adAccountId: selectedAdAccountId,
      level,
      dateMode,
      datePreset,
      since,
      until,
      fields,
      breakdowns,
    });

    const response = await facebookAdsService.createAsyncReport(payload);
    const reportRunId = extractReportRunId(response);

    if (!reportRunId) {
      throw new Error("Meta لم ترجع report_run_id لهذا التقرير");
    }

    const status = await fetchStatus(reportRunId);
    setAsyncRun({
      reportRunId,
      status,
      results: null,
      createdAt: new Date().toISOString(),
    });

    if (status?.status === "Job Completed") {
      await fetchResults(reportRunId);
    } else if (!isTerminalStatus(status?.status)) {
      setPolling(true);
    }
  };

  const runSyncReport = async () => {
    if (!selectedAdAccountId) {
      tToast.error("MediaBuyingReports.msg_17dc");
      return;
    }
    if (dateMode === "preset") {
      tToast.error("MediaBuyingReports.msg_d8c5");
      return;
    }
    if (!since || !until) {
      tToast.error("MediaBuyingReports.msg_c2d1");
      return;
    }

    const report = await facebookAdsService.getPerformanceBreakdownReport({
      adAccountId: selectedAdAccountId,
      startDate: since,
      endDate: until,
      breakdown: syncBreakdown,
    });
    setSyncReport(report);
  };

  const handleRun = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSyncReport(null);

    try {
      setRunning(true);
      if (mode === "async") {
        await runAsyncReport();
      } else {
        await runSyncReport();
      }
    } catch (runError: any) {
      const message =
        runError?.response?.data?.error ||
        runError?.message ||
        "فشل تشغيل التقرير";
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white font-sans sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col gap-5">
        <FacebookAdsAccountContextPanel context={accountContext} compact />

        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-300">
              <BarChart3 className="h-4 w-4" />
              Meta Ads Report Builder
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal sm:text-3xl">
              تقارير Meta Ads التنفيذية
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              ابن تقريرًا آمنًا من نفس خدمات الواجهة الحالية: تشغيل async كامل من Meta،
              أو معاينة sync سريعة عبر breakdown endpoint الموجود.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-slate-500">Mode</span>
              <span>{mode === "async" ? "Async" : "Sync"}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-slate-500">Level</span>
              <span>{level}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-slate-500">Fields</span>
              <span>{fields.length}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-slate-500">Breakdowns</span>
              <span>{breakdowns.length}</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleRun} className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-black">إعداد التقرير</h2>
            </div>

            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-sm font-black">طريقة التشغيل</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "async", label: "Async", icon: Clock3 },
                    { value: "sync", label: "Sync preview", icon: Database },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setMode(item.value as ReportMode)}
                        className={[
                          "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-black transition",
                          mode === item.value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black">مستوى التقرير</span>
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value as ReportLevel)}
                  disabled={mode === "sync"}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                >
                  {reportLevels.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.hint}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-sm font-black">التاريخ</span>
                <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
                  {[
                    { value: "preset", label: "Preset" },
                    { value: "range", label: "Range" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDateMode(item.value as DateMode)}
                      className={[
                        "rounded-md px-3 py-1.5 text-xs font-black",
                        dateMode === item.value
                          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                          : "text-slate-500",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {dateMode === "preset" ? (
                  <select
                    value={datePreset}
                    onChange={(event) => setDatePreset(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {datePresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">من</span>
                      <input
                        type="date"
                        value={since}
                        onChange={(event) => setSince(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">إلى</span>
                      <input
                        type="date"
                        value={until}
                        onChange={(event) => setUntil(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                      />
                    </label>
                  </div>
                )}
              </div>

              {mode === "sync" ? (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-black">Breakdown للمعاينة</span>
                  <select
                    value={syncBreakdown}
                    onChange={(event) =>
                      setSyncBreakdown(event.target.value as FacebookPerformanceBreakdown)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {syncBreakdownOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button
                type="submit"
                disabled={running || accountContext.requiresAdAccountSelection}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                تشغيل التقرير
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black">الحقول والـ breakdowns</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Async يمرر الاختيارات كما هي إلى Meta Insights. Sync preview يستخدم
                    endpoint التحليل الحالي.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFields(defaultFields)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:text-slate-200"
                >
                  الحقول الافتراضية
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-black">Fields</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visibleFields.map((field) => (
                      <label
                        key={field.value}
                        className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={fields.includes(field.value)}
                          onChange={() => toggleField(field.value)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-black">Breakdowns</span>
                  <div className="grid grid-cols-2 gap-2">
                    {breakdownOptions.map((breakdown) => (
                      <label
                        key={breakdown.value}
                        className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={breakdowns.includes(breakdown.value)}
                          onChange={() => toggleBreakdown(breakdown.value)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span>{breakdown.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black">حالة التشغيل</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {selectedAdAccount?.name || "لا يوجد حساب محدد"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {asyncRun?.reportRunId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fetchStatus()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                        تحديث الحالة
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchResults()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                      >
                        <Table2 className="h-4 w-4" />
                        جلب النتائج
                      </button>
                    </>
                  ) : null}
                  {resultRows.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => downloadCsv(resultRows, tableFields)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="p-4">
                {asyncRun ? (
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <p className="text-xs font-black text-slate-500">Report run</p>
                      <p className="mt-1 break-all text-sm font-bold">
                        {asyncRun.reportRunId}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <p className="text-xs font-black text-slate-500">Status</p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold">
                        {activeStatus?.status === "Job Completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : polling ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-slate-500" />
                        )}
                        {statusText}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <p className="text-xs font-black text-slate-500">Progress</p>
                      <p className="mt-1 text-sm font-bold">
                        {activeStatus?.percentComplete ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <p className="text-xs font-black text-slate-500">Rows</p>
                      <p className="mt-1 text-sm font-bold">{resultRows.length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[150px] items-center justify-center text-center">
                    <div>
                      <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-3 text-sm font-bold text-slate-500">
                        شغّل تقريرًا لعرض الحالة والنتائج.
                      </p>
                    </div>
                  </div>
                )}

                {statusHasV25Error ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <p>Meta async error fields</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <span>code: {activeStatus?.errorCode || "-"}</span>
                      <span>subcode: {activeStatus?.errorSubcode || "-"}</span>
                      <span>{activeStatus?.errorMessage || "-"}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {syncReport ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <h2 className="text-base font-black">Sync preview</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {syncReport.rows.length} breakdown rows / source{" "}
                    {syncReport.meta?.source || "META"}
                  </p>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-black text-slate-500">Spend</p>
                    <p className="mt-1 text-sm font-bold">
                      {formatCurrency(
                        syncReport.totals.spend,
                        selectedAdAccount?.currency || "EGP",
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-black text-slate-500">Purchases</p>
                    <p className="mt-1 text-sm font-bold">
                      {formatNumber(syncReport.totals.purchases)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-black text-slate-500">CTR</p>
                    <p className="mt-1 text-sm font-bold">
                      {(syncReport.totals.ctr || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-black text-slate-500">ROAS</p>
                    <p className="mt-1 text-sm font-bold">
                      {(syncReport.totals.roas || 0).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {resultRows.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <h2 className="text-base font-black">نتائج async</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    أول {resultRows.length} صف من Meta.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500 dark:bg-slate-950">
                      <tr>
                        {tableFields.map((field) => (
                          <th key={field} className="px-3 py-3">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {resultRows.slice(0, 50).map((row, index) => (
                        <tr key={`${asyncRun?.reportRunId}-${index}`}>
                          {tableFields.map((field) => (
                            <td
                              key={`${index}-${field}`}
                              className="max-w-[260px] truncate px-3 py-3 font-semibold text-slate-700 dark:text-slate-200"
                              title={getCellValue(row, field)}
                            >
                              {getCellValue(row, field)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </form>
      </div>
    </div>
  );
};

export default MediaBuyingReports;
