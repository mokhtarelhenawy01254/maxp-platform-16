import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../services/apiClient";

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
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    productName?: string;
    quantity: number;
    price: number;
    total: number;
    status: string;
  }>;
}

const BulkOrderView = ({ id, onBack, onEdit, onDuplicate, onExport }: BulkOrderViewProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [data, setData] = useState<BulkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200",
      PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
      COMPLETED: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200",
      FAILED: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200",
      CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.DRAFT}`}>
        {t(`orders.bulkStatus${status}`)}
      </span>
    );
  };

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
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkOrderNumber")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemCustomer")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemProduct")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemQuantity")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemPrice")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemTotal")}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  {t("orders.bulkItemStatus")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("orders.bulkNoItems")}
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                      {item.orderNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <p className="font-medium">{item.customerName || "-"}</p>
                        {item.customerPhone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.customerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.productName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {Number(item.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
