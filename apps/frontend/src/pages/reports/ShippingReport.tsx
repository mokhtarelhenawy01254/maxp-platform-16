import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

interface ShippingReportData {
  orderId: string;
  orderNumber: string;
  actualCost: number;
  customerCost: number;
  difference: number;
  status: string;
  trackingNumber: string;
  createdAt: string;
  governorate: string;
  costSource: string;
}

interface ShippingStatistics {
  totalOrders: number;
  ordersWithCost: number;
  totalActual: number;
  totalCustomer: number;
  totalDifference: number;
  avgActual: number;
  avgCustomer: number;
}

const ShippingReport: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ShippingReportData[]>([]);
  const [statistics, setStatistics] = useState<ShippingStatistics | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });
  const [editModal, setEditModal] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
    currentCost: number;
    newCost: string;
  }>({ open: false, orderId: "", orderNumber: "", currentCost: 0, newCost: "" });
  const [bulkModal, setBulkModal] = useState<{
    open: boolean;
    newCost: string;
    saving: boolean;
  }>({ open: false, newCost: "", saving: false });
  const [savingCost, setSavingCost] = useState(false);
  const [govCostModal, setGovCostModal] = useState(false);
  const [govCosts, setGovCosts] = useState<Record<string, number>>({});
  const [govCostsLoading, setGovCostsLoading] = useState(false);
  const [govCostsSaving, setGovCostsSaving] = useState(false);
  const [govCostsForm, setGovCostsForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    fetchReport();
  }, [isAuthenticated, filters]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status) params.append("status", filters.status);

      const response = await apiClient.get(
        `/turbo/reports/shipping?${params.toString()}`,
      );
      if (response.data.success) {
        setReportData(response.data.data.orders);
        setStatistics(response.data.data.statistics);
      }
    } catch (error: any) {
      console.error("Error fetching shipping report:", error);
      const msg = error.response?.data?.message || error.response?.data?.error || "فشل جلب التقرير";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateSingleCost = async () => {
    if (!editModal.orderId || !editModal.newCost) return;
    setSavingCost(true);
    try {
      await apiClient.patch("/turbo/reports/shipping/cost", {
        orderId: editModal.orderId,
        actualCost: parseFloat(editModal.newCost),
      });
      toast.success("تم تحديث التكلفة الفعلية");
      setEditModal({ ...editModal, open: false, newCost: "" });
      fetchReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "فشل تحديث التكلفة");
    } finally {
      setSavingCost(false);
    }
  };

  const updateBulkCost = async () => {
    if (!bulkModal.newCost || reportData.length === 0) return;
    setBulkModal({ ...bulkModal, saving: true });
    try {
      const orderIds = reportData.map((r) => r.orderId);
      await apiClient.post("/turbo/reports/shipping/bulk-cost", {
        orderIds,
        actualCost: parseFloat(bulkModal.newCost),
      });
      toast.success(`تم تحديث ${orderIds.length} طلب`);
      setBulkModal({ open: false, newCost: "", saving: false });
      fetchReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "فشل التحديث الجماعي");
      setBulkModal({ ...bulkModal, saving: false });
    }
  };

  const loadGovernorateCosts = async () => {
    setGovCostsLoading(true);
    try {
      const res = await apiClient.get("/turbo/reports/shipping/governorate-costs");
      if (res.data.success) {
        const data = res.data.data || {};
        setGovCosts(data);
        const form: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) form[k] = String(v);
        setGovCostsForm(form);
      }
    } catch (e: any) {
      toast.error("فشل تحميل إعدادات المحافظات");
    } finally {
      setGovCostsLoading(false);
    }
  };

  const openGovernorateCosts = async () => {
    setGovCostModal(true);
    await loadGovernorateCosts();
  };

  const saveGovernorateCosts = async () => {
    setGovCostsSaving(true);
    try {
      const costs: Record<string, number> = {};
      for (const [gov, val] of Object.entries(govCostsForm)) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) costs[gov] = num;
      }
      await apiClient.put("/turbo/reports/shipping/governorate-costs", { costs });
      toast.success("تم حفظ تكاليف المحافظات");
      setGovCostModal(false);
      fetchReport();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "فشل الحفظ");
    } finally {
      setGovCostsSaving(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status) params.append("status", filters.status);
      params.append("export", "csv");

      const response = await apiClient.get(
        `/turbo/reports/shipping?${params.toString()}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `turbo-shipping-report-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast.error("فشل تصدير التقرير");
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status)
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    const statusLower = status.toLowerCase();
    if (statusLower === "delivered")
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (statusLower === "cancelled" || statusLower === "returned")
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (statusLower === "in_transit" || statusLower === "out_for_delivery")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  const getStatusText = (status?: string) => {
    if (!status) return "غير محدد";
    const statusMap: { [key: string]: string } = {
      created: "تم الإنشاء",
      picked_up: "تم الاستلام",
      in_transit: "قيد النقل",
      out_for_delivery: "في الطريق للتسليم",
      delivered: "تم التسليم",
      cancelled: "ملغاة",
      returned: "مرتجعة",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-black/20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="flex items-center text-2xl font-bold text-gray-900 dark:text-white">
              <ChartBarIcon className="h-6 w-6 text-blue-500 ml-2" />
              تقرير الشحن - مقارنة الأسعار
            </h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={openGovernorateCosts}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <ChartBarIcon className="w-5 h-5 ml-2" />
                تكاليف المحافظات
              </button>
              {reportData.length > 0 && (
                <button
                  onClick={() => setBulkModal({ open: true, newCost: "", saving: false })}
                  className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <PencilIcon className="w-5 h-5 ml-2" />
                  تعديل جماعي
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <ArrowDownTrayIcon className="w-5 h-5 ml-2" />
                تصدير إلى Excel (CSV)
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/80 md:grid-cols-3">
            <div>
              <label
                htmlFor="shipping-report-start-date"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                من تاريخ
              </label>
              <input
                id="shipping-report-start-date"
                name="startDate"
                type="date"
                autoComplete="off"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="shipping-report-end-date"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                إلى تاريخ
              </label>
              <input
                id="shipping-report-end-date"
                name="endDate"
                type="date"
                autoComplete="off"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="shipping-report-status"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                الحالة
              </label>
              <select
                id="shipping-report-status"
                name="status"
                autoComplete="off"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">جميع الحالات</option>
                <option value="created">تم الإنشاء</option>
                <option value="picked_up">تم الاستلام</option>
                <option value="in_transit">قيد النقل</option>
                <option value="out_for_delivery">في الطريق للتسليم</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغاة</option>
                <option value="returned">مرتجعة</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    إجمالي الطلبات (مع tracking)
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {statistics.totalOrders}
                  </div>
                </div>
                <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-950/30">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    إجمالي السعر الفعلي
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    {formatPrice(statistics.totalActual)} EGP
                  </div>
                </div>
                <div className="rounded-lg border-l-4 border-gray-500 bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    إجمالي سعر العميل
                  </div>
                  <div className="mt-1 text-2xl font-bold text-gray-600 dark:text-gray-200">
                    {formatPrice(statistics.totalCustomer)} EGP
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border-l-4 ${
                    statistics.totalDifference > 0
                      ? "bg-red-50 border-red-500 dark:bg-red-950/30"
                      : statistics.totalDifference < 0
                        ? "bg-green-50 border-green-500 dark:bg-green-950/30"
                        : "bg-gray-50 border-gray-500 dark:bg-gray-800"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    إجمالي الفرق
                  </div>
                  <div
                    className={`text-2xl font-bold mt-1 ${
                      statistics.totalDifference > 0
                        ? "text-red-600"
                        : statistics.totalDifference < 0
                          ? "text-green-600"
                          : "text-gray-600 dark:text-gray-200"
                    }`}
                  >
                    {statistics.totalDifference > 0 ? "+" : ""}
                    {formatPrice(statistics.totalDifference)} EGP
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border-r-4 border-purple-500 bg-purple-50 p-4 dark:bg-purple-950/30">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    متوسط السعر الفعلي
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">
                    {formatPrice(statistics.avgActual)} EGP
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    إجمالي {statistics.ordersWithCost} طلب بسعر فعلي
                  </div>
                </div>
                <div className="rounded-lg border-r-4 border-orange-500 bg-orange-50 p-4 dark:bg-orange-950/30">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    متوسط سعر العميل
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mt-1">
                    {formatPrice(statistics.avgCustomer)} EGP
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    على {statistics.totalOrders} طلب
                  </div>
                </div>
                <div className="rounded-lg border-r-4 border-cyan-500 bg-cyan-50 p-4 dark:bg-cyan-950/30">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    متوسط الفرق للطلب
                  </div>
                  <div
                    className={`text-2xl font-bold mt-1 ${
                      statistics.totalDifference > 0
                        ? "text-red-600"
                        : statistics.totalDifference < 0
                          ? "text-green-600"
                          : "text-gray-600 dark:text-gray-200"
                    }`}
                  >
                    {statistics.totalDifference > 0 ? "+" : ""}
                    {formatPrice(
                      statistics.totalOrders > 0
                        ? statistics.totalDifference / statistics.totalOrders
                        : 0
                    )}{" "}
                    EGP
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Governorate Costs Modal */}
          {govCostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-bold">تكاليف الشحن الفعلية حسب المحافظة</h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  أدخل التكلفة الفعلية من شركة الشحن لكل محافظة. هتطبق تلقائي على كل الطلبات اللي نفس المحافظة.
                </p>
                {govCostsLoading ? (
                  <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {[
                      "القاهرة", "الجيزة", "الإسكندرية", "الشرقية", "الدقهلية",
                      "البحيرة", "المنيا", "القليوبية", "سوهاج", "كفر الشيخ",
                      "الغربية", "المنوفية", "قنا", "أسيوط", "الفيوم",
                      "بني سويف", "دمياط", "الإسماعيلية", "أسوان", "الأقصر",
                      "مطروح", "بورسعيد", "السويس", "شمال سيناء", "جنوب سيناء",
                      "الوادي الجديد", "البحر الأحمر"
                    ].map((gov) => (
                      <div key={gov} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{gov}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={govCostsForm[gov] ?? ""}
                            onChange={(e) => setGovCostsForm({ ...govCostsForm, [gov]: e.target.value })}
                            placeholder="التكلفة"
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-left text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                          />
                          <span className="text-xs text-gray-400">ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setGovCostModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveGovernorateCosts}
                    disabled={govCostsSaving}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {govCostsSaving ? "جاري الحفظ..." : "حفظ التكاليف"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Single Cost Modal */}
          {editModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-bold">تعديل التكلفة الفعلية</h3>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  الطلب: <span className="font-medium text-gray-900 dark:text-gray-100">#{editModal.orderNumber}</span>
                </p>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  سعر العميل الحالي: <span className="font-medium">{formatPrice(editModal.currentCost)} EGP</span>
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={editModal.newCost}
                  onChange={(e) => setEditModal({ ...editModal, newCost: e.target.value })}
                  placeholder="أدخل التكلفة الفعلية من شركة الشحن"
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditModal({ ...editModal, open: false, newCost: "" })}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={updateSingleCost}
                    disabled={savingCost || !editModal.newCost}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingCost ? "جاري الحفظ..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Edit Modal */}
          {bulkModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-bold">تعديل جماعي</h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  تطبيق التكلفة الفعلية على جميع طلبات التقرير الحالي ({reportData.length} طلب)
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={bulkModal.newCost}
                  onChange={(e) => setBulkModal({ ...bulkModal, newCost: e.target.value })}
                  placeholder="أدخل التكلفة الفعلية الموحدة"
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setBulkModal({ open: false, newCost: "", saving: false })}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={updateBulkCost}
                    disabled={bulkModal.saving || !bulkModal.newCost}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {bulkModal.saving ? "جاري الحفظ..." : "تطبيق على الكل"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">جاري تحميل التقرير...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">لا توجد طلبات مع كود Turbo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      رقم الطلب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      المحافظة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      كود Turbo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      السعر الفعلي
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      سعر العميل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      الفرق
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {reportData.map((row) => (
                    <tr
                      key={row.orderId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            navigate(`/orders/${row.orderNumber}`)
                          }
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          #{row.orderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {row.governorate || "--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {row.trackingNumber || "--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {row.actualCost > 0 ? (
                            <span className="font-bold text-blue-600">
                              {formatPrice(row.actualCost)} EGP
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              غير متوفر
                            </span>
                          )}
                          <button
                            onClick={() =>
                              setEditModal({
                                open: true,
                                orderId: row.orderId,
                                orderNumber: row.orderNumber,
                                currentCost: row.customerCost,
                                newCost: row.actualCost > 0 ? String(row.actualCost) : "",
                              })
                            }
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="تعديل التكلفة الفعلية"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatPrice(row.customerCost)} EGP
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.actualCost > 0 ? (
                          <span
                            className={`font-bold ${
                              row.difference > 0
                                ? "text-red-600"
                                : row.difference < 0
                                  ? "text-green-600"
                                  : "text-gray-600 dark:text-gray-200"
                            }`}
                          >
                            {row.difference > 0 ? "+" : ""}
                            {formatPrice(row.difference)} EGP
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            --
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}
                        >
                          {getStatusText(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingReport;
