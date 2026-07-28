import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { getStatusDisplay } from "../../../utils/statusRegistry";

interface BulkOrderViewProps {
  id: string;
  onBack: () => void;
  onEdit: (item: any) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string, format?: string) => void;
}

interface BulkOrderDetail {
  id: string;
  operationNumber: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  totalOrders: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  items: Array<{
    id: string;
    customerName?: string;
    customerPhone?: string;
    city?: string;
    governorate?: string;
    productName?: string;
    sku?: string;
    size?: string;
    color?: string;
    quantity: number;
    price: number;
    total: number;
    status: string;
    notes?: string;
  }>;
}

const BulkOrderView = ({ id, onBack, onEdit, onDuplicate, onExport }: BulkOrderViewProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [data, setData] = useState<BulkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/bulk-orders/${id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch bulk order detail", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await apiClient.post(`/api/v1/bulk-orders/${id}/execute`);
      if (res.data?.success) {
        const { successCount, errors: execErrors } = res.data;
        if (execErrors && execErrors.length > 0) {
          toast.warning(
            t("orders.bulkExecutedPartial", { success: successCount, failed: execErrors.length }) ||
            `${successCount} succeeded, ${execErrors.length} failed`
          );
        } else {
          toast.success(t("orders.bulkExecuted") || "Operation executed successfully");
        }
        const refresh = await apiClient.get(`/api/v1/bulk-orders/${id}`);
        if (refresh.data?.success) {
          setData(refresh.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkExecuteFailed") || "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = getStatusDisplay(status);
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${info.colorClass}`}>
        {t(info.labelKey) || info.label}
      </span>
    );
  };

  const getColorHex = (color: string): string | null => {
    const map: Record<string, string> = {
      'black': '#000', 'white': '#fff', 'red': '#ef4444', 'blue': '#3b82f6',
      'green': '#22c55e', 'yellow': '#eab308', 'orange': '#f97316',
      'purple': '#a855f7', 'pink': '#ec4899', 'gray': '#6b7280', 'grey': '#6b7280',
      'brown': '#92400e', 'navy': '#1e3a5f', 'beige': '#f5f0e1', 'gold': '#f59e0b',
      'silver': '#cbd5e1', 'أحمر': '#ef4444', 'أزرق': '#3b82f6', 'أخضر': '#22c55e',
      'أصفر': '#eab308', 'برتقالي': '#f97316', 'بنفسجي': '#a855f7', 'وردي': '#ec4899',
      'أسود': '#000', 'أبيض': '#fff', 'رمادي': '#6b7280', 'بني': '#92400e',
      'كحلي': '#1e3a5f', 'ذهبي': '#f59e0b', 'فضي': '#cbd5e1',
    };
    return map[color?.toLowerCase()] || null;
  };

  const totalQty = data?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalPrice = data?.items.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        {t("orders.bulkNoData")}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{data.operationNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(data)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t("orders.bulkEdit")}
          </button>
          <button onClick={() => onDuplicate(data.id)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t("orders.bulkDuplicate")}
          </button>
          {(data.status !== "COMPLETED" && data.status !== "CANCELLED" && data.status !== "PROCESSING") && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white transition-colors flex items-center gap-1.5"
            >
              {executing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t("orders.bulkExecute")}
            </button>
          )}
          <button onClick={() => onExport(data.id, "excel")} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            {t("orders.bulkExportExcel")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.bulkStatus")}</p>
          <div className="mt-1">{getStatusBadge(data.status)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.bulkTotalOrders")}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data.totalOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.bulkProgress")}</p>
          <div className="mt-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${data.progress === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{data.progress}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.bulkCreatedBy")}</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{data.createdByName || "-"}</p>
        </div>
      </div>

      {data.description && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t("orders.bulkDescriptionLabel")}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{data.description}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("orders.bulkItems")} ({data.items.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemCustomer")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemCity")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemGovernorate")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemProduct")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemSKU")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemSize")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemColor")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemQuantity")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemPrice")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemTotal")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">
                  {t("orders.bulkItemStatus")}
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left min-w-[80px]">
                  {t("orders.bulkItemNotes")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("orders.bulkNoItems")}
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <div>
                        <p className="font-medium">{item.customerName || "-"}</p>
                        {item.customerPhone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.customerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.city || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.governorate || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.productName || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.sku || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.size || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.color ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0"
                            style={{ backgroundColor: getColorHex(item.color) || '#d1d5db' }}
                          />
                          {item.color}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{item.quantity}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {Number(item.total).toFixed(2)}
                    </td>
                    <td className="px-3 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={item.notes || ""}>
                      {item.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-600 dark:text-gray-400">
              {t("orders.bulkItems")}: {data.items.length}
            </span>
            <div className="flex items-center gap-6">
              <span className="text-gray-600 dark:text-gray-400">
                {t("orders.bulkItemQuantity")}: <span className="text-indigo-700 dark:text-indigo-300">{totalQty}</span>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t("orders.bulkItemTotal")}: <span className="text-indigo-700 dark:text-indigo-300 font-bold">{Number(totalPrice).toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t("orders.bulkCreatedAt")}:</span>{" "}
          {new Date(data.createdAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t("orders.bulkUpdatedAt")}:</span>{" "}
          {new Date(data.updatedAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}
        </div>
      </div>
    </div>
  );
};

export default BulkOrderView;
