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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          تقرير الحالات
        </h1>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            اختر حالة الطلب:
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

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              من تاريخ:
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              إلى تاريخ:
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchReport}
            disabled={selectedStatuses.length === 0 || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <FunnelIcon className="h-4 w-4" />
            )}
            عرض البيانات
          </button>

          {reportData && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              تصدير CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="mr-3 text-gray-500">جاري تحميل التقرير...</span>
        </div>
      )}

      {reportData && !loading && (
        <>
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-2 text-base font-bold text-blue-800 dark:text-blue-200">
              حالات الطلبات المختارة:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-300">
              {selectedStatuses.map((code) => (
                <li key={code}>
                  {statusOptions.find((o) => o.value === code)?.label || code}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportData.rows.map((row) => (
              <div
                key={row.status}
                className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <h5 className="text-base font-bold text-gray-900 dark:text-white">
                    {statusOptions.find((o) => o.value === row.status)?.label || row.status}
                  </h5>
                </div>
                <div className="px-0 py-0">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    <li className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      عدد الطلبات: {formatNumber(row.ordersCount)}
                    </li>
                    <li className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      عدد القطع: {formatNumber(row.itemsCount)}
                    </li>
                    <li className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      قيمة المنتجات: {formatEGP(row.productsValue)}
                    </li>
                    <li className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      قيمة الشحن: {formatEGP(row.shippingValue)}
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                البيانات الإجمالية
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800 dark:bg-gray-700">
                    <th className="px-4 py-3 font-semibold text-white">
                      عدد الطلبات
                    </th>
                    <th className="px-4 py-3 font-semibold text-white">
                      عدد القطع
                    </th>
                    <th className="px-4 py-3 font-semibold text-white">
                      قيمة المنتجات
                    </th>
                    <th className="px-4 py-3 font-semibold text-white">
                      قيمة الشحن
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/orders?status=${selectedStatuses.join(",").toLowerCase()}`,
                          )
                        }
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400"
                      >
                        {formatNumber(reportData.totals.ordersCount)}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/orders?view=items&status=${selectedStatuses.join(",").toLowerCase()}`,
                          )
                        }
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400"
                      >
                        {formatNumber(reportData.totals.itemsCount)}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatEGP(reportData.totals.productsValue)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatEGP(reportData.totals.shippingValue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && selectedStatuses.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            لا توجد بيانات للعرض. حاول تغيير نطاق التاريخ أو اختيار حالات أخرى.
          </p>
        </div>
      )}

      {selectedStatuses.length === 0 && !loading && !reportData && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            اختر حالة أو أكثر من القائمة أعلاه ثم اضغط &quot;عرض البيانات&quot;
          </p>
        </div>
      )}
    </div>
  );
};

export default StatusSummaryReport;
