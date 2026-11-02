import React from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import {
  CompanyDetails,
  OrdersStats,
  getCompanyOrderImageUrl,
} from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface CompanyOrdersHeaderAndStatsProps {
  company: CompanyDetails | null;
  stats: OrdersStats | null;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onBack: () => void;
  onExport: () => void;
}

export const CompanyOrdersHeaderAndStats: React.FC<
  CompanyOrdersHeaderAndStatsProps
> = ({
  company,
  stats,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  onBack,
  onExport,
}) => {
  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="العودة للتقارير"
            >
              <ArrowRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {company?.logo ? (
                  <img
                    src={getCompanyOrderImageUrl(company.logo) || ""}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BuildingOffice2Icon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  {company?.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تفاصيل الطلبات والمنتجات
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            تصدير
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <ShoppingCartIcon className="w-4 h-4" />
              إجمالي الطلبات
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white">
              {stats.totalOrders}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <CurrencyDollarIcon className="w-4 h-4" />
              الإيرادات
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-green-600">
              {stats.totalRevenue.toLocaleString()} ج.م
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              مكتمل
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white">
              {stats.completedOrders}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <ClockIcon className="w-4 h-4 text-yellow-500" />
              قيد الانتظار
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white">
              {stats.pendingOrders}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <XCircleIcon className="w-4 h-4 text-red-500" />
              ملغي
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white">
              {stats.cancelledOrders}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              فلترة:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              من:
            </label>
            <DateInput
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono tabular-nums dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              إلى:
            </label>
            <DateInput
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono tabular-nums dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value="all">كل الحالات</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="CONFIRMED">مؤكد</option>
            <option value="PROCESSING">جاري التجهيز</option>
            <option value="SHIPPED">تم الشحن</option>
            <option value="DELIVERED">تم التوصيل</option>
            <option value="CANCELLED">ملغي</option>
          </select>
        </div>
      </div>
    </>
  );
};
