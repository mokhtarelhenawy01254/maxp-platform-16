import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import {
  PlusIcon,
  EyeIcon,
  ShoppingBagIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  orderSource: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
}

const AffiliateOrders: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    orderSource: "",
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.orderSource) params.orderSource = filters.orderSource;

      const response = await apiClient.get("/affiliates/orders", { params });
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch {
      tToast.error("affiliates_AffiliateOrders.error_error_9817");
    } finally {
      setLoading(false);
    }
  }, [filters.orderSource, filters.status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; lightClass: string; darkClass: string }
    > = {
      PENDING: {
        label: "معلق",
        lightClass: "bg-yellow-100 text-yellow-800",
        darkClass: "bg-yellow-900/50 text-yellow-300",
      },
      CONFIRMED: {
        label: "مؤكد",
        lightClass: "bg-blue-100 text-blue-800",
        darkClass: "bg-blue-900/50 text-blue-300",
      },
      DELIVERED: {
        label: "تم التسليم",
        lightClass: "bg-green-100 text-green-800",
        darkClass: "bg-green-900/50 text-green-300",
      },
      CANCELLED: {
        label: "ملغي",
        lightClass: "bg-red-100 text-red-800",
        darkClass: "bg-red-900/50 text-red-300",
      },
    };
    const statusInfo = statusMap[status] || {
      label: status,
      lightClass: "bg-gray-100 text-gray-800",
      darkClass: "bg-gray-700 text-gray-300",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${isDark ? statusInfo.darkClass : statusInfo.lightClass}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<
      string,
      { label: string; lightClass: string; darkClass: string }
    > = {
      AFFILIATE_REFERRAL: {
        label: "إحالة",
        lightClass: "bg-purple-100 text-purple-800",
        darkClass: "bg-purple-900/50 text-purple-300",
      },
      AFFILIATE_DIRECT: {
        label: "مباشر",
        lightClass: "bg-indigo-100 text-indigo-800",
        darkClass: "bg-indigo-900/50 text-indigo-300",
      },
      REGULAR: {
        label: "عادي",
        lightClass: "bg-gray-100 text-gray-800",
        darkClass: "bg-gray-700 text-gray-300",
      },
    };
    const sourceInfo = sourceMap[source] || {
      label: source,
      lightClass: "bg-gray-100 text-gray-800",
      darkClass: "bg-gray-700 text-gray-300",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${isDark ? sourceInfo.darkClass : sourceInfo.lightClass}`}
      >
        {sourceInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 sm:p-6`}
    >
      <div className="w-full space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className={`text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
            >
              طلباتي
            </h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm sm:mt-2 sm:text-base`}>
              جميع الطلبات المرتبطة بك
            </p>
          </div>
          <button
            onClick={() => navigate("/affiliates/orders/create")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء طلب جديد
          </button>
        </div>

        {/* Filters */}
        <div
          className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-3 shadow-sm sm:p-4`}
        >
          <div className="grid gap-3 sm:flex sm:items-center sm:gap-4">
            <FunnelIcon
              className={`hidden h-5 w-5 sm:block ${isDark ? "text-gray-400" : "text-gray-500"}`}
            />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className={`min-h-11 w-full rounded-xl border px-4 py-2 text-sm sm:w-auto ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">معلق</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="DELIVERED">تم التسليم</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            <select
              value={filters.orderSource}
              onChange={(e) =>
                setFilters({ ...filters, orderSource: e.target.value })
              }
              className={`min-h-11 w-full rounded-xl border px-4 py-2 text-sm sm:w-auto ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">جميع المصادر</option>
              <option value="AFFILIATE_REFERRAL">إحالة</option>
              <option value="AFFILIATE_DIRECT">مباشر</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div
          className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} overflow-hidden rounded-2xl border shadow-sm`}
        >
          {orders.length > 0 ? (
            <div className="p-3 md:p-0">
              <table className="block min-w-full md:table md:divide-y md:divide-gray-200">
                <thead
                  className={`hidden md:table-header-group ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                >
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      رقم الطلب
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      العميل
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المبلغ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الحالة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المصدر
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      العمولة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      التاريخ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`block space-y-3 md:table-row-group md:space-y-0 ${isDark ? "md:bg-gray-800 md:divide-gray-700" : "md:bg-white md:divide-gray-200"} md:divide-y`}
                >
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`block rounded-2xl border p-4 transition md:table-row md:rounded-none md:border-0 md:p-0 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/35 hover:bg-gray-700"
                          : "border-gray-100 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`flex items-start justify-between gap-4 pb-3 text-sm font-semibold md:table-cell md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "text-gray-100" : "text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          رقم الطلب
                        </span>
                        <span>{order.orderNumber}</span>
                      </td>
                      <td
                        className={`flex items-start justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          العميل
                        </span>
                        <span className="text-left md:text-right">
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                            : "مخفي"}
                          <br />
                          <span className={isDark ? "text-gray-500" : "text-gray-500"}>
                            {order.customer?.phone || "-"}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t py-3 text-sm font-medium md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          المبلغ
                        </span>
                        <span>{formatPrice(order.total)}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          الحالة
                        </span>
                        <span>{getStatusBadge(order.status)}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          المصدر
                        </span>
                        <span>{getSourceBadge(order.orderSource)}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 text-sm font-medium text-green-600 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          العمولة
                        </span>
                        <span>
                          {order.commissions && order.commissions.length > 0
                            ? formatPrice(order.commissions[0].amount)
                            : "-"}
                        </span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          التاريخ
                        </span>
                        <span>{new Date(order.createdAt).toLocaleDateString("ar-EG")}</span>
                      </td>
                      <td className="border-t pt-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <button
                          onClick={() =>
                            navigate(
                              `/affiliates/orders/${encodeURIComponent(String(order.id))}`,
                            )
                          }
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-blue-700 transition hover:bg-blue-100 md:min-h-9 md:w-auto md:bg-transparent md:px-3 md:py-1.5 md:text-blue-600 md:hover:bg-blue-50 md:hover:text-blue-800"
                        >
                          <EyeIcon className="h-4 w-4" />
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBagIcon
                className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
              />
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                لا توجد طلبات بعد
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateOrders;
