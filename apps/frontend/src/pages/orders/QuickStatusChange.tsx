import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import orderWorkflowService, { OrderStatusDefinition } from "../../services/orderWorkflowService";
import {
  Search,
  ArrowRight,
  Loader2,
  Package,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "SCHEDULED", "READY_FOR_PROCESSING",
  "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
  "DUPLICATE_ORDER", "REFUNDED", "RETURNED", "PARTIALLY_RETURNED",
  "EXCHANGED", "PARTIALLY_REFUNDED", "WOO_TAGHEZ", "DRAFT",
  "TRASH", "READY_TO_SHIP", "ON_HOLD", "NOT_SHIPPED",
  "OUT_FOR_DELIVERY", "LOST", "PENDING_PREPARATION", "PREPARING",
  "READY", "QUALITY_CHECK", "PACKAGED", "ON_HOLD_PREP", "PARTIALLY_DELIVERED",
];

const STATUS_CONFIG: Record<string, { labelAr: string; color: string }> = {
  PENDING: { labelAr: "معلق", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  CONFIRMED: { labelAr: "مؤكد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  SCHEDULED: { labelAr: "مجدول", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  READY_FOR_PROCESSING: { labelAr: "جاهز للمعالجة", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  PROCESSING: { labelAr: "قيد المعالجة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  SHIPPED: { labelAr: "تم الشحن", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  DELIVERED: { labelAr: "تم التسليم", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  CANCELLED: { labelAr: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  DUPLICATE_ORDER: { labelAr: "طلب مكرر", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  REFUNDED: { labelAr: "تم الاسترداد", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400" },
  RETURNED: { labelAr: "مرتجع", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PARTIALLY_RETURNED: { labelAr: "مرتجع جزئي", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  EXCHANGED: { labelAr: "مستبدل", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  PARTIALLY_REFUNDED: { labelAr: "مسترجع جزئي", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400" },
  WOO_TAGHEZ: { labelAr: "Woo Taghez", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  DRAFT: { labelAr: "مسودة", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
  TRASH: { labelAr: "محذوف", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  READY_TO_SHIP: { labelAr: "جاهز للشحن", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ON_HOLD: { labelAr: "معلق", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  NOT_SHIPPED: { labelAr: "لم يتم الشحن", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
  OUT_FOR_DELIVERY: { labelAr: "خرج للتسليم", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  LOST: { labelAr: "مفقود", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PENDING_PREPARATION: { labelAr: "بانتظار التجهيز", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PREPARING: { labelAr: "قيد التجهيز", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  READY: { labelAr: "جاهز", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  QUALITY_CHECK: { labelAr: "فحص الجودة", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  PACKAGED: { labelAr: "تم التعبئة", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  ON_HOLD_PREP: { labelAr: "تجهيز معلق", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PARTIALLY_DELIVERED: { labelAr: "تسليم جزئي", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  currency?: string;
}

interface ChangeLogEntry {
  id: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  const config = STATUS_CONFIG[status] || {
    labelAr: label || status,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {label || config.labelAr}
    </span>
  );
};

const QuickStatusChange: React.FC = () => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [orderCode, setOrderCode] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [siteStatuses, setSiteStatuses] = useState<{id: string, name: string, code?: string}[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    orderWorkflowService.getStatuses()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setSiteStatuses(res.data.map((s: OrderStatusDefinition) => ({ id: s.id, name: s.name, code: s.code })));
        } else if (Array.isArray(res)) {
          setSiteStatuses(res.map((s: OrderStatusDefinition) => ({ id: s.id, name: s.name, code: s.code })));
        }
      })
      .catch((err) => {
        // Silent fail - fallback to static statuses
        console.warn("Could not fetch site statuses, using defaults:", err?.response?.status);
      });
  }, []);

  const handleSearch = useCallback(async () => {
    const code = orderCode.trim();
    if (!code) {
      toast.error(t("quickStatus.enterOrderCode"));
      return;
    }

    // Preserve status pre-selected by user before searching
    const preSelectedStatus = selectedStatus;

    setSearchLoading(true);
    setHasSearched(true);
    setSearchError("");
    setCurrentOrder(null);

    try {
      const response = await apiClient.get(`/orders-enhanced/${encodeURIComponent(code)}`);
      const body = response.data;
      if (body?.success && body?.data) {
        const order = { ...body.data, status: body.data.status?.toUpperCase() };
        setCurrentOrder(order);

        // If user pre-selected a status, keep it; otherwise default to order's current status
        const statusToSet = preSelectedStatus || order.status;
        setSelectedStatus(statusToSet);
        
        setChangeLog((prev) => {
          const exists = prev.find(p => p.id === order.id);
          if (exists) return prev;
          
          const newEntry: ChangeLogEntry = {
            id: order.id,
            orderNumber: order.orderNumber,
            oldStatus: order.status,
            newStatus: "",
            changedAt: new Date().toLocaleString("ar-EG"),
          };
          return [newEntry, ...prev];
        });

        // Auto-change if user had pre-selected a different status
        if (preSelectedStatus && preSelectedStatus !== order.status) {
          try {
            const changeRes = await apiClient.post("/order-workflow/change-status", {
              orderId: order.id,
              statusId: preSelectedStatus,
              isOverride: true,
            });
            if (changeRes.data?.data?.status === "pending") {
              toast.info(t("quickStatus.pendingApproval"));
            } else {
              setChangeLog((prev) =>
                prev.map((entry) =>
                  entry.id === order.id
                    ? { ...entry, newStatus: preSelectedStatus, changedAt: new Date().toLocaleString("ar-EG") }
                    : entry
                )
              );
              setCurrentOrder({ ...order, status: preSelectedStatus });
              toast.success(t("quickStatus.changeSuccess"));
            }
          } catch (changeErr) {
            console.error("Auto-change error:", changeErr);
            const axErr = changeErr as { response?: { data?: { message?: string } } };
            toast.error(axErr.response?.data?.message || t("quickStatus.changeError"));
          }
        }
      } else {
        setSearchError(t("quickStatus.orderNotFound", { code }));
      }
    } catch (error) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 404) {
        setSearchError(t("quickStatus.orderNotFound", { code }));
      } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setSearchError("انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً.");
      } else {
        console.error("Search error:", error);
        setSearchError(t("quickStatus.searchError"));
      }

    } finally {
      setSearchLoading(false);
    }
  }, [orderCode, t]);

  const handleChangeStatus = useCallback(async () => {
    if (!currentOrder) return;
    if (!selectedStatus) {
      toast.error(t("quickStatus.selectStatus"));
      return;
    }
    if (selectedStatus === currentOrder.status) {
      toast.error(t("quickStatus.sameStatus"));
      return;
    }

    setChangeLoading(true);
    try {
      const response = await apiClient.post("/order-workflow/change-status", {
        orderId: currentOrder.id,
        statusId: selectedStatus,
        isOverride: true,
      });
      if (response.data?.data?.status === "pending") {
        toast.info(t("quickStatus.pendingApproval"));
      } else {
        setChangeLog((prev) => 
          prev.map((entry) => 
            entry.id === currentOrder.id 
              ? { ...entry, newStatus: selectedStatus, changedAt: new Date().toLocaleString("ar-EG") }
              : entry
          )
        );
        setCurrentOrder((prev) =>
          prev ? { ...prev, status: selectedStatus } : null
        );
        toast.success(t("quickStatus.changeSuccess"));
      }
    } catch (error) {
      console.error("Status change error:", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const msg = axiosError.response?.data?.message || t("quickStatus.changeError");
      toast.error(msg);
    } finally {
      setChangeLoading(false);
    }
  }, [currentOrder, selectedStatus, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // If we already have an order loaded and a different status is selected → change directly
      if (currentOrder && selectedStatus && selectedStatus !== currentOrder.status) {
        handleChangeStatus();
      } else {
        handleSearch();
      }
    }
  };

  const handleClear = () => {
    setOrderCode("");
    setCurrentOrder(null);
    setSelectedStatus("");
    setSearchError("");
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const getStatusDisplayName = (statusValue: string) => {
    // Check if it's a dynamic status ID or code
    const dynStatus = siteStatuses.find(s => s.id === statusValue || s.code === statusValue);
    if (dynStatus) return dynStatus.name;
    // Fallback to static mapping
    return STATUS_CONFIG[statusValue]?.labelAr || statusValue;
  };

  const hasChanges = changeLog.length > 0;

  return (
    <div className="p-6 w-full" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <RotateCcw className="text-blue-600 dark:text-blue-400" size={32} />
          {t("quickStatus.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("quickStatus.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-[3] w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("quickStatus.orderCode")}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ابحث برقم الأوردر أو الكود..."
                className="w-full px-6 py-5 pr-14 text-xl border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                disabled={searchLoading}
              />
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                size={26}
              />
            </div>
          </div>

          <div className="w-full md:w-80">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("quickStatus.newStatus")}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-5 py-5 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
              disabled={changeLoading}
            >
              <option value="">
                {t("quickStatus.selectStatus")}
              </option>
              {(siteStatuses.length > 0
                ? siteStatuses
                : ORDER_STATUSES.map((s) => ({
                    id: s,
                    name: STATUS_CONFIG[s]?.labelAr || s,
                  }))
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleSearch}
              disabled={searchLoading || !orderCode.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {searchLoading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Search size={22} />
              )}
              {t("quickStatus.search")}
            </button>
            <button
              onClick={handleChangeStatus}
              disabled={changeLoading || !currentOrder || !selectedStatus || selectedStatus === currentOrder?.status}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {changeLoading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <ArrowRight size={22} />
              )}
              {t("quickStatus.change")}
            </button>
            <button
              onClick={handleClear}
              disabled={searchLoading || changeLoading}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {t("quickStatus.clear")}
            </button>
          </div>
        </div>
      </div>

      {searchLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {searchError && !searchLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" size={20} />
          <p className="text-red-800 dark:text-red-300">{searchError}</p>
        </div>
      )}

      {currentOrder && !searchLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border-r-4 border-blue-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Package className="text-blue-600 dark:text-blue-400" size={24} />
              <div>
                <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                  {currentOrder.orderNumber}
                </span>
                {currentOrder.customerName && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-3">
                    {currentOrder.customerName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("quickStatus.currentStatus")}
                </p>
                <StatusBadge status={currentOrder.status} label={getStatusDisplayName(currentOrder.status)} />
              </div>
              {currentOrder.total != null && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t("quickStatus.total")}
                  </p>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {Number(currentOrder.total).toFixed(2)} {currentOrder.currency || "ج.م"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <RotateCcw className="text-blue-600 dark:text-blue-400" size={20} />
              {t("quickStatus.changeLog")} ({changeLog.length})
            </h2>
            <button
              onClick={() => setChangeLog([])}
              className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            >
              مسح السجل
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("quickStatus.orderCode")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("quickStatus.oldStatus")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("quickStatus.newStatus")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("quickStatus.changedAt")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {changeLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                        {entry.orderNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={entry.oldStatus} label={getStatusDisplayName(entry.oldStatus)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.newStatus ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.newStatus} label={getStatusDisplayName(entry.newStatus)} />
                          <CheckCircle
                            className="text-green-500 shrink-0"
                            size={16}
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.changedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasSearched && !currentOrder && !searchLoading && !searchError && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <Search className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={64} />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {t("quickStatus.noResults")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t("quickStatus.searchFirst")}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickStatusChange;
