import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";
import StatusReportTable from "./StatusReportTable";
import type {
  EventRow,
  TemplateScopeConfig,
  StatusReportData,
  StatusReportItem,
  ReportRange,
} from "../types";

export interface StatusReportTabProps {
  statuses: EventRow[];
  config: TemplateScopeConfig;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function reportRangeParams(range: ReportRange, startDate: string, endDate: string) {
  const today = new Date();
  if (range === "today") {
    const s = localDateStr(today);
    return { startDate: s, endDate: s };
  }
  if (range === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = localDateStr(y);
    return { startDate: s, endDate: s };
  }
  if (range === "7d") {
    const s7 = new Date(today);
    s7.setDate(s7.getDate() - 6);
    return { startDate: localDateStr(s7), endDate: localDateStr(today) };
  }
  return { startDate, endDate };
}

function humanizeEventType(code: string): string {
  return code
    .replace(/^CUSTOMER_/, "")
    .replace(/^ORDER_/, "")
    .replace(/_/g, " ")
    .toLowerCase();
}

export default function StatusReportTab({ statuses, config }: StatusReportTabProps) {
  const { t } = useTranslation();
  const noun = config.entityLabel ?? { singular: "حالة", plural: "حالات" };
  const [range, setRange] = useState<ReportRange>("7d");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return localDateStr(d);
  });
  const [endDate, setEndDate] = useState(() => localDateStr(new Date()));
  const [typeFilter, setTypeFilter] = useState<"all" | "meta" | "regular">("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusReportData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailByEvent, setDetailByEvent] = useState<
    Record<string, { loading: boolean; items: StatusReportItem[] }>
  >({});

  const statusNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of statuses) {
      if (s.code && s.name) m.set(s.code, s.name);
    }
    return m;
  }, [statuses]);

  const enabledStatusCodes = useMemo(() => {
    const s = new Set<string>();
    for (const st of statuses) {
      if (st.notifyCustomer) s.add(st.code);
    }
    return s;
  }, [statuses]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dates = reportRangeParams(range, startDate, endDate);
      const categories = config.reportCategories && config.reportCategories.length > 0
        ? config.reportCategories.join(",")
        : undefined;
      const eventTypes = config.reportEventTypes && config.reportEventTypes.length > 0
        ? config.reportEventTypes.join(",")
        : undefined;

      const res = await apiClient.get(
        config.endpoints?.report || "/whatsapp-templates/templates/report/by-status",
        {
          params: {
            ...dates,
            categories,
            eventTypes,
          },
        }
      );
      setData(res.data?.data || null);
    } catch {
      toast.error(t("orders.reportLoadFailed", "فشل تحميل تقرير الإرسال"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate, config, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = async (eventType: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
        if (!detailByEvent[eventType]?.items) {
          fetchEventDetail(eventType);
        }
      }
      return next;
    });
  };

  const fetchEventDetail = async (eventType: string) => {
    setDetailByEvent((p) => ({ ...p, [eventType]: { loading: true, items: [] } }));
    try {
      const dates = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get("/whatsapp-templates/templates/report/status-messages", {
        params: {
          ...dates,
          eventType,
          limit: 100,
        },
      });
      setDetailByEvent((p) => ({
        ...p,
        [eventType]: { loading: false, items: res.data?.data || [] },
      }));
    } catch {
      toast.error("فشل تحميل رسائل الحدث التفصيلية");
      setDetailByEvent((p) => ({ ...p, [eventType]: { loading: false, items: [] } }));
    }
  };

  const exportCsv = async () => {
    if (!data?.items?.length) return;
    setExporting(true);
    try {
      const dates = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get("/whatsapp-templates/templates/report/export-csv", {
        params: dates,
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whatsapp-status-report-${dates.startDate}-to-${dates.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t("orders.reportExportDone", "تم تصدير التقرير"));
    } catch {
      toast.error(t("orders.reportExportFailed", "فشل تصدير التقرير"));
    } finally {
      setExporting(false);
    }
  };

  const visibleRows = useMemo(() => {
    if (!data?.byEvent) return [];
    return Object.entries(data.byEvent)
      .map(([eventType, st]) => ({
        eventType,
        total: st.total || 0,
        meta: st.meta || 0,
        regular: st.regular || 0,
        delivered: st.delivered || 0,
        failed: st.failed || 0,
      }))
      .filter((r) => {
        if (typeFilter === "meta") return r.meta > 0;
        if (typeFilter === "regular") return r.regular > 0;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [data?.byEvent, typeFilter]);

  const enabledWithoutSends = useMemo(() => {
    if (!data?.byEvent) return [];
    const withSends = new Set(Object.keys(data.byEvent));
    return statuses.filter((s) => s.notifyCustomer && !withSends.has(s.code));
  }, [data?.byEvent, statuses]);

  const kpis = useMemo(() => {
    const totals = data?.totals || { total: 0, meta: 0, regular: 0, delivered: 0, failed: 0 };
    return [
      { label: "إجمالي الإرسالات", value: totals.total, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
      { label: "قوالب ميتا", value: totals.meta, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
      { label: "واتساب عادي", value: totals.regular, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
      { label: "تم التسليم بنجاح", value: totals.delivered, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
      { label: "فشل الإرسال", value: totals.failed, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
    ];
  }, [data?.totals]);

  const renderProviderBadge = (provider: string | null) => {
    if (provider === "META_CLOUD") {
      return (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          ميتا (Cloud)
        </span>
      );
    }
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        واتساب عادي
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const s = String(status || "").toUpperCase();
    if (s === "SENT" || s === "DELIVERED" || s === "READ") {
      return (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          تم التسليم
        </span>
      );
    }
    if (s === "FAILED" || s === "ERROR") {
      return (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          فشل
        </span>
      );
    }
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {s || "قيد المعالجة"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: تاريخ + فلترة + تصدير */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { key: "today", label: "اليوم" },
            { key: "yesterday", label: "أمس" },
            { key: "7d", label: "آخر 7 أيام" },
            { key: "custom", label: "فترة مخصصة" },
          ] as const).map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                range === r.key
                  ? "bg-indigo-600 text-white font-bold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || localDateStr(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="من تاريخ"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value || localDateStr(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="إلى تاريخ"
            />
          </div>
        )}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold cursor-pointer"
          aria-label="فلترة نوع الإرسال"
        >
          <option value="all">كل الأنواع</option>
          <option value="meta">قالب ميتا</option>
          <option value="regular">واتساب عادي</option>
        </select>

        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || !data?.items?.length}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          {exporting ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <DocumentTextIcon className="h-3.5 w-3.5" />
          )}
          تصدير CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200/70 bg-white p-3.5 dark:border-white/10 dark:bg-slate-900/50">
                <p className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${k.bg} ${k.color}`}>{k.label}</p>
                <p className={`mt-2 text-2xl font-bold tabular-nums font-mono ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {enabledWithoutSends.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">{noun.plural} مفعّلة بدون إرسالات في هذه الفترة:</span>{" "}
                {enabledWithoutSends.map((s) => s.name).join("، ")}
                <span className="block text-xs opacity-80 mt-0.5">لو كان يفترض إرسال رسائل منها، راجع قوالبها من تبويبات القوالب.</span>
              </div>
            </div>
          )}

          {/* Per-status summary table */}
          <StatusReportTable
            visibleRows={visibleRows}
            statusNameMap={statusNameMap}
            humanizeEventType={humanizeEventType}
            expanded={expanded}
            toggleExpand={toggleExpand}
            detailByEvent={detailByEvent}
            renderProviderBadge={renderProviderBadge}
            renderStatusBadge={renderStatusBadge}
          />
        </>
      )}
    </div>
  );
}
