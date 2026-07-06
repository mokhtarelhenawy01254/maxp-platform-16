import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { MultiSelect, MultiSelectOption } from "../../components/ui/MultiSelect";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

interface StatusRow {
  status: string;
  ordersCount: number;
  itemsCount: number;
  productsValue: number;
  shippingValue: number;
}

interface StatusSummaryData {
  rows: StatusRow[];
  totals: {
    ordersCount: number;
    itemsCount: number;
    productsValue: number;
    shippingValue: number;
  };
}

const StatusSummaryReport: React.FC = () => {
  const navigate = useNavigate();

  const [statusOptions, setStatusOptions] = useState<MultiSelectOption[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [reportData, setReportData] = useState<StatusSummaryData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [fetchingStatuses, setFetchingStatuses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatuses = async () => {
      setFetchingStatuses(true);
      try {
        const res = await apiClient.get("/analytics/statuses");
        const statuses: { code: string; name: string }[] = res.data?.data || [];
        setStatusOptions(
          statuses.map((s) => ({ value: s.code, label: s.name })),
        );
      } catch (err) {
        console.error("Failed to load statuses:", err);
      } finally {
        setFetchingStatuses(false);
      }
    };
    loadStatuses();
  }, []);

  const fetchReport = useCallback(async () => {
    if (selectedStatuses.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        statuses: selectedStatuses.join(","),
      };
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await apiClient.get("/analytics/status-summary", { params });
      setReportData(res.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في تحميل التقرير");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStatuses, dateRange]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const headers = ["الحالة", "عدد الطلبات", "عدد القطع", "قيمة المنتجات", "قيمة الشحن"];
    const rows = reportData.rows.map((r) => [
      statusOptions.find((o) => o.value === r.status)?.label || r.status,
      r.ordersCount,
      r.itemsCount,
      r.productsValue,
      r.shippingValue,
    ]);
    const totalsRow = [
      "الإجمالي",
      reportData.totals.ordersCount,
      reportData.totals.itemsCount,
      reportData.totals.productsValue,
      reportData.totals.shippingValue,
    ];
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      totalsRow.join(","),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_الحالات_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatEGP = (val: number) =>
    new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + " ج.م";

  const formatNumber = (val: number) =>
    new Intl.NumberFormat("ar-EG").format(val);

  return (
    <div className="flex h-full flex-col" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تقرير الحالات
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            تحليل مجمع لحالات الطلبات
          </p>
        </div>
        {reportData && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            تصدير CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 pb-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                اختر حالة الطلب
              </label>
              {fetchingStatuses ? (
                <div className="flex h-10 items-center gap-2 text-sm text-gray-400">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  جاري تحميل الحالات...
                </div>
              ) : (
                <MultiSelect
                  options={statusOptions}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="اختر حالة أو أكثر..."
                  searchPlaceholder="بحث عن حالة..."
                  emptyText="لا توجد حالات متاحة"
                />
              )}
            </div>
            <div className="w-36">
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                من تاريخ
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-gray-700"
              />
            </div>
            <div className="w-36">
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-gray-700"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={fetchReport}
                disabled={selectedStatuses.length === 0 || loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <FunnelIcon className="h-4 w-4" />
                )}
                عرض البيانات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل التقرير...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {reportData && !loading && (
        <div className="flex flex-1 flex-col gap-0 overflow-hidden px-6 pb-6">
          {/* Selected statuses tags */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-400">الحالات المختارة:</span>
            {selectedStatuses.map((code) => (
              <span
                key={code}
                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {statusOptions.find((o) => o.value === code)?.label || code}
              </span>
            ))}
          </div>

          {/* Per-status cards */}
          {reportData.rows.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {reportData.rows.map((row) => {
                const label = statusOptions.find((o) => o.value === row.status)?.label || row.status;
                return (
                  <div
                    key={row.status}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</h5>
                    </div>
                    <div className="space-y-0">
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">عدد الطلبات</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(row.ordersCount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 text-sm dark:border-gray-700/50">
                        <span className="text-gray-500 dark:text-gray-400">عدد القطع</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(row.itemsCount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 text-sm dark:border-gray-700/50">
                        <span className="text-gray-500 dark:text-gray-400">قيمة المنتجات</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatEGP(row.productsValue)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 text-sm dark:border-gray-700/50">
                        <span className="text-gray-500 dark:text-gray-400">قيمة الشحن</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatEGP(row.shippingValue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals Table - Full Width Hero */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                البيانات الإجمالية
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-800 text-white dark:bg-gray-900">
                    <th className="px-6 py-4 text-sm font-semibold">عدد الطلبات</th>
                    <th className="px-6 py-4 text-sm font-semibold">عدد القطع</th>
                    <th className="px-6 py-4 text-sm font-semibold">قيمة المنتجات</th>
                    <th className="px-6 py-4 text-sm font-semibold">قيمة الشحن</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-white transition-colors hover:bg-gray-50/50 dark:border-gray-700/50 dark:bg-gray-800 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/orders?status=${selectedStatuses.join(",").toLowerCase()}`)
                        }
                        className="text-lg font-bold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {formatNumber(reportData.totals.ordersCount)}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/orders?view=items&status=${selectedStatuses.join(",").toLowerCase()}`)
                        }
                        className="text-lg font-bold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {formatNumber(reportData.totals.itemsCount)}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-lg font-bold text-gray-900 dark:text-white">
                      {formatEGP(reportData.totals.productsValue)}
                    </td>
                    <td className="px-6 py-5 text-lg font-bold text-gray-900 dark:text-white">
                      {formatEGP(reportData.totals.shippingValue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty: no selection */}
      {selectedStatuses.length === 0 && !loading && !reportData && (
        <div className="flex flex-1 items-center justify-center px-6 pb-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <FunnelIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              اختر حالة أو أكثر للبدء
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              اختر حالة أو أكثر من القائمة أعلاه ثم اضغط &quot;عرض البيانات&quot;
            </p>
          </div>
        </div>
      )}

      {/* Empty: no results */}
      {!reportData && !loading && selectedStatuses.length > 0 && (
        <div className="flex flex-1 items-center justify-center px-6 pb-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              لا توجد نتائج
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              لا توجد بيانات للعرض. حاول تغيير نطاق التاريخ أو اختيار حالات أخرى.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSummaryReport;
