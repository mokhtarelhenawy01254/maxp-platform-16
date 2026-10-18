import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import {
  getTurboStatusDisplay,
  getStatusDisplay,
} from "../../../utils/statusRegistry";
import type { TurboOrder } from "./useTurboRecordsData";

interface TurboRecordsTableProps {
  orders: TurboOrder[];
  loading: boolean;
  selectedOrders: string[];
  totalOrders: number;
  page: number;
  totalPages: number;
  onToggleAll: () => void;
  onToggleOrder: (id: string) => void;
  onPageChange: (newPage: number) => void;
}

export const TurboRecordsTable: React.FC<TurboRecordsTableProps> = ({
  orders,
  loading,
  selectedOrders,
  totalOrders,
  page,
  totalPages,
  onToggleAll,
  onToggleOrder,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right"
          dir="rtl"
        >
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
              >
                <input
                  type="checkbox"
                  aria-label="تحديد جميع الطلبات"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={
                    orders.length > 0 && selectedOrders.length === orders.length
                  }
                  onChange={onToggleAll}
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.orderLabel")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.customer")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.total")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.orderStatus")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.trackingNumber")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.k_33")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.date")}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t("orders.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex justify-center mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                  {t("orders.loadingOrders")}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("orders.noOrdersFound")}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      aria-label={`تحديد الطلب ${order.orderNumber}`}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => onToggleOrder(order.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/orders/${encodeURIComponent(String(order.id))}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                    >
                      #{order.orderNumber || order.id.substring(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.customerName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {order.customerPhone}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {order.governorate} - {order.city}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        getStatusDisplay(order.status).colorClass
                      }`}
                    >
                      {getStatusDisplay(order.status).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.turboTrackingNumber || order.turboShipmentId ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono border border-gray-200 dark:border-gray-600">
                          {order.turboTrackingNumber || order.turboShipmentId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getTurboStatusDisplay(
                            order.turboShipmentStatus || ""
                          ).colorClass
                        }`}
                      >
                        {
                          getTurboStatusDisplay(
                            order.turboShipmentStatus || ""
                          ).label
                        }
                      </span>
                      {(order.turboLiveStatus || order.turboCaptainName) && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {order.turboLiveStatus?.status ||
                            order.turboShipmentStatus}
                          {order.turboCaptainName &&
                            ` - مندوب: ${order.turboCaptainName}`}
                          {order.turboCaptainName &&
                            order.turboCaptainPhone &&
                            ` (${order.turboCaptainPhone})`}
                          {!order.turboCaptainName &&
                            order.turboLiveStatus?.captain &&
                            ` - ${order.turboLiveStatus.captain}`}
                        </span>
                      )}
                      {order.turboBranchName && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 font-medium">
                          فرع: {order.turboBranchName}
                          {order.turboBranchPhone
                            ? ` (${order.turboBranchPhone})`
                            : ""}
                        </span>
                      )}
                      {(order.turboReturnReason ||
                        order.turboLiveStatus?.returnReason) && (
                        <span className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800 font-medium">
                          {t("orders.k_39")}{" "}
                          {order.turboReturnReason ||
                            order.turboLiveStatus?.returnReason}
                        </span>
                      )}
                      {(order.turboDelayReason ||
                        order.turboLiveStatus?.delayReason) && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-800 font-medium">
                          {t("orders.k_40")}{" "}
                          {order.turboDelayReason ||
                            order.turboLiveStatus?.delayReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <Link
                      to={`/orders/${encodeURIComponent(String(order.id))}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 ml-3"
                    >
                      {t("orders.view")}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {t("orders.totalOrders")}:{" "}
          <span className="font-medium font-mono tabular-nums">
            {totalOrders}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 text-xs font-semibold"
          >
            {t("orders.previous")}
          </button>
          <span className="px-3 py-1 text-gray-700 dark:text-gray-300 text-xs font-mono">
            {t("orders.pageOf", { page, totalPages })}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 text-xs font-semibold"
          >
            {t("orders.next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurboRecordsTable;
