import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { MultiSelect, MultiSelectOption } from "../../components/ui/MultiSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  totals: { ordersCount: number; itemsCount: number; productsValue: number; shippingValue: number };
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  shipping: number;
  governorate: string | null;
  city: string | null;
  paymentMethod: string;
  sourceType: string | null;
  createdAt: string;
  customer?: { name: string; phone: string } | null;
}

interface ItemDetail {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  itemId: string;
  productName: string | null;
  productColor: string | null;
  productSize: string | null;
  quantity: number;
  price: number;
  total: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const StatusSummaryReport: React.FC = () => {
  const [statusOptions, setStatusOptions] = useState<MultiSelectOption[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [reportData, setReportData] = useState<StatusSummaryData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [fetchingStatuses, setFetchingStatuses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"orders" | "items">("orders");
  const [dialogOrders, setDialogOrders] = useState<OrderDetail[]>([]);
  const [dialogItems, setDialogItems] = useState<ItemDetail[]>([]);
  const [dialogPagination, setDialogPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatuses = async () => {
      setFetchingStatuses(true);
      try {
        const res = await apiClient.get("/analytics/statuses");
        const statuses: { code: string; name: string }[] = res.data?.data || [];
        setStatusOptions(statuses.map((s) => ({ value: s.code, label: s.name })));
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
      const params: Record<string, string> = { statuses: selectedStatuses.join(",") };
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

  const openDrillDown = async (mode: "orders" | "items", pageNum = 1) => {
    setDialogMode(mode);
    setDialogOpen(true);
    setDialogLoading(true);
    setDialogError(null);
    try {
      const params: Record<string, string> = {
        statuses: selectedStatuses.join(","),
        page: String(pageNum),
        limit: "50",
      };
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await apiClient.get(`/analytics/status-summary/${mode}`, { params });
      const data = res.data?.data;
      if (mode === "orders") {
        setDialogOrders(data.orders || []);
      } else {
        setDialogItems(data.items || []);
      }
      setDialogPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err: any) {
      setDialogError(err?.response?.data?.message || "فشل في تحميل التفاصيل");
    } finally {
      setDialogLoading(false);
    }
  };

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
    const totalsRow = ["الإجمالي", reportData.totals.ordersCount, reportData.totals.itemsCount, reportData.totals.productsValue, reportData.totals.shippingValue];
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(",")), totalsRow.join(",")].join("\n");
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

  const formatNumber = (val: number) => new Intl.NumberFormat("ar-EG").format(val);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });

  const statusLabel = (code: string) =>
    statusOptions.find((o) => o.value === code.toUpperCase())?.label || code;

  return (
    <div className="flex h-full flex-col" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقرير الحالات</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">تحليل مجمع لحالات الطلبات</p>
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
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">اختر حالة الطلب</label>
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
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">من تاريخ</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-gray-700"
              />
            </div>
            <div className="w-36">
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">إلى تاريخ</label>
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
                {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <FunnelIcon className="h-4 w-4" />}
                عرض البيانات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>
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
              <span key={code} className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {statusLabel(code)}
              </span>
            ))}
          </div>

          {/* Per-status cards */}
          {reportData.rows.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {reportData.rows.map((row) => (
                <div key={row.status} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{statusLabel(row.status)}</h5>
                  </div>
                  <div className="space-y-0">
                    {[
                      ["عدد الطلبات", formatNumber(row.ordersCount)],
                      ["عدد القطع", formatNumber(row.itemsCount)],
                      ["قيمة المنتجات", formatEGP(row.productsValue)],
                      ["قيمة الشحن", formatEGP(row.shippingValue)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 text-sm dark:border-gray-700/50">
                        <span className="text-gray-500 dark:text-gray-400">{label}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals Table */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">البيانات الإجمالية</h2>
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
                        onClick={() => openDrillDown("orders")}
                        className="text-lg font-bold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {formatNumber(reportData.totals.ordersCount)}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => openDrillDown("items")}
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

      {/* Drill-down Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {dialogMode === "orders" ? "تفاصيل الطلبات" : "تفاصيل القطع"}
              <span className="mr-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({formatNumber(dialogPagination.total)})
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            {dialogLoading ? (
              <div className="flex items-center justify-center py-16">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : dialogError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{dialogError}</div>
            ) : dialogMode === "orders" ? (
              dialogOrders.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">لا توجد طلبات</p>
              ) : (
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">رقم الطلب</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">العميل</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">الحالة</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">الإجمالي</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">المحافظة</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dialogOrders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50 dark:border-gray-700/50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{o.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.customer?.name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {statusLabel(o.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{formatEGP(o.total)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.governorate || o.city || "—"}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              dialogItems.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">لا توجد قطع</p>
              ) : (
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">المنتج</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">اللون</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">المقاس</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">الكمية</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">السعر</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">الإجمالي</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">رقم الطلب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dialogItems.map((item, idx) => (
                      <tr key={`${item.itemId}-${idx}`} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50 dark:border-gray-700/50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.productName || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.productColor || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.productSize || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatNumber(item.quantity)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatEGP(item.price)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{formatEGP(item.total)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.orderNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Pagination */}
          {!dialogLoading && dialogPagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-2 pt-4 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                صفحة {formatNumber(dialogPagination.page)} من {formatNumber(dialogPagination.totalPages)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={dialogPagination.page <= 1}
                  onClick={() => openDrillDown(dialogMode, dialogPagination.page - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                  السابق
                </button>
                <button
                  type="button"
                  disabled={dialogPagination.page >= dialogPagination.totalPages}
                  onClick={() => openDrillDown(dialogMode, dialogPagination.page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  التالي
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty: no selection */}
      {selectedStatuses.length === 0 && !loading && !reportData && (
        <div className="flex flex-1 items-center justify-center px-6 pb-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <FunnelIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">اختر حالة أو أكثر للبدء</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">اختر حالة أو أكثر من القائمة أعلاه ثم اضغط &quot;عرض البيانات&quot;</p>
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
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">لا توجد نتائج</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات للعرض. حاول تغيير نطاق التاريخ أو اختيار حالات أخرى.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSummaryReport;
