import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import { formatCurrency } from "@/utils/currency";
import { CustomerDetailsData } from "./types";

interface CustomerOrdersTabProps {
  orders: CustomerDetailsData["recentOrders"];
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({ orders }) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  if (orders.length === 0) {
    return (
      <p className="text-center text-xs sm:text-sm text-zinc-500 py-8">
        {t("customers.noOrders")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead>
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">
              {t("orders.orderNumber")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">
              {t("common.status")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">
              {t("orders.amount")}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">
              {t("common.date")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/orders/${encodeURIComponent(String(order.id))}`}
                  className="text-zinc-900 dark:text-zinc-100 font-bold font-mono hover:underline text-xs sm:text-sm"
                >
                  #{order.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700">
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-xs sm:text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(order.total)}
              </td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs tabular-nums">
                {formatDate(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
