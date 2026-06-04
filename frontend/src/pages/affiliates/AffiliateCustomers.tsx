import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

const AffiliateCustomers: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/affiliates/customers");
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error: unknown) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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
              عملائي
            </h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm sm:mt-2 sm:text-base`}>
              جميع العملاء المرتبطين بك
            </p>
          </div>
          <button
            onClick={() => navigate("/affiliates/orders/create")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            إنشاء طلب لعميل
          </button>
        </div>

        {customers.length > 0 ? (
          <div
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} overflow-hidden rounded-2xl border shadow-sm`}
          >
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
                      الاسم
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الهاتف
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      البريد الإلكتروني
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      عدد الطلبات
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      إجمالي المشتريات
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
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`block rounded-2xl border p-4 transition md:table-row md:rounded-none md:border-0 md:p-0 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/35 hover:bg-gray-700"
                          : "border-gray-100 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`flex items-center justify-between gap-4 pb-3 text-sm font-semibold md:table-cell md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "text-gray-100" : "text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          الاسم
                        </span>
                        <span>{customer.firstName} {customer.lastName}</span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          الهاتف
                        </span>
                        <span>{customer.phone}</span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          البريد
                        </span>
                        <span className="max-w-[12rem] truncate text-left md:max-w-none md:text-right">
                          {customer.email || "-"}
                        </span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          عدد الطلبات
                        </span>
                        <div className="flex items-center gap-1">
                          <ShoppingBagIcon
                            className={`h-4 w-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                          />
                          {customer.totalOrders}
                        </div>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 text-sm font-medium text-green-600 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          إجمالي المشتريات
                        </span>
                        <div className="flex items-center gap-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          {formatPrice(customer.totalSpent)}
                        </div>
                      </td>
                      <td className="border-t pt-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <button
                          onClick={() =>
                            navigate(
                              `/affiliates/orders/create?customerId=${customer.id}`,
                            )
                          }
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-50 px-4 py-2 text-blue-700 transition hover:bg-blue-100 md:min-h-0 md:w-auto md:bg-transparent md:p-0 md:text-blue-600 md:hover:bg-transparent md:hover:text-blue-800"
                        >
                          إنشاء طلب
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl py-12 text-center shadow-sm ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <UserGroupIcon
              className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
            />
            <p className={isDark ? "text-gray-400" : "text-gray-500"}>
              لا يوجد عملاء مرتبطين بك بعد
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateCustomers;
