import React from "react";
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CompanySalesData, SalesReportData } from "./types";
import { getOwnerReportsImageUrl } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface OwnerSalesReportSectionProps {
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onRangeSelect: (range: string) => void;
  overview?: SalesReportData["overview"];
  companies: CompanySalesData[];
  onNavigateCompanyOrders: (companyId: string) => void;
}

export const OwnerSalesReportSection: React.FC<
  OwnerSalesReportSectionProps
> = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onRangeSelect,
  overview,
  companies,
  onNavigateCompanyOrders,
}) => {
  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onRangeSelect("today")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              اليوم
            </button>
            <button
              onClick={() => onRangeSelect("yesterday")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              أمس
            </button>
            <button
              onClick={() => onRangeSelect("week")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => onRangeSelect("month")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              آخر 30 يوم
            </button>
            <button
              onClick={() => onRangeSelect("thisMonth")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => onRangeSelect("lastMonth")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              الشهر الماضي
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400 mr-1" />
            <DateInput
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent border-none text-sm font-mono tabular-nums text-gray-700 dark:text-gray-200 focus:ring-0 p-0 w-32"
            />
            <span className="text-gray-400 text-sm">إلى</span>
            <DateInput
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent border-none text-sm font-mono tabular-nums text-gray-700 dark:text-gray-200 focus:ring-0 p-0 w-32"
            />
          </div>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
            <p className="text-sm opacity-80">عدد الشركات</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {overview.totalCompanies}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <ShoppingCartIcon className="w-4 h-4" /> إجمالي الطلبات
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalOrders}
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <CurrencyDollarIcon className="w-4 h-4" /> إجمالي الإيرادات
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {overview.totalRevenue.toLocaleString()} ج.م
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircleIcon className="w-4 h-4" /> مكتمل
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalCompleted}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircleIcon className="w-4 h-4" /> ملغي
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalCancelled}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            مقارنة الشركات
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  الطلبات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  الإيرادات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  مكتمل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  ملغي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  نسبة الإكمال
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {companies.map((item) => (
                <tr
                  key={item.company.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.company.logo ? (
                          <img
                            src={
                              getOwnerReportsImageUrl(item.company.logo) || ""
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateCompanyOrders(item.company.id);
                          }}
                          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-right cursor-pointer"
                        >
                          {item.company.name}
                        </button>
                        <span className="text-xs text-gray-400">
                          اضغط لعرض التفاصيل
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {item.stats.totalOrders}
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums text-green-600 font-medium">
                    {item.stats.totalRevenue.toLocaleString()} ج.م
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {item.stats.completedOrders}
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {item.stats.cancelledOrders}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium font-mono tabular-nums ${
                        item.stats.completionRate >= 80
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : item.stats.completionRate >= 50
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {item.stats.completionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
