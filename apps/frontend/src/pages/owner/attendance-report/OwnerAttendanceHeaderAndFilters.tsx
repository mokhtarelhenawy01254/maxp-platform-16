import React from "react";
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentChartBarIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UserGroupIcon,
  UserMinusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  AttendanceReportData,
  OwnerReportSortBy,
  OwnerReportViewMode,
} from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface OwnerAttendanceHeaderAndFiltersProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onOpenReportModal: () => void;
  onExport: () => void;
  isExporting: boolean;
  overview?: AttendanceReportData["overview"];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCompanyFilter: string;
  onCompanyFilterChange: (val: string) => void;
  companies: Array<{ id: string; name: string }>;
  sortBy: OwnerReportSortBy;
  onSortByChange: (val: OwnerReportSortBy) => void;
  viewMode: OwnerReportViewMode;
  onViewModeChange: (mode: OwnerReportViewMode) => void;
  filteredCount: number;
}

export const OwnerAttendanceHeaderAndFilters: React.FC<
  OwnerAttendanceHeaderAndFiltersProps
> = ({
  selectedPreset,
  onPresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onOpenReportModal,
  onExport,
  isExporting,
  overview,
  searchQuery,
  onSearchChange,
  selectedCompanyFilter,
  onCompanyFilterChange,
  companies,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  filteredCount,
}) => {
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="w-7 h-7 text-indigo-600" />
            تقرير حضور الموظفين
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تتبُّع انضباط الموظفين في جميع شركاتك
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center justify-end">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
            <select
              value={selectedPreset}
              onChange={(e) => onPresetChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 dark:text-white"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="beforeYesterday">أول أمس</option>
              <option value="lastWeek">آخر ٧ أيام</option>
              <option value="thisMonth">هذا الشهر</option>
              <option value="lastMonth">الشهر الماضي</option>
              <option value="custom">مخصص</option>
            </select>
            <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-600"></div>
            <CalendarDaysIcon className="w-5 h-5 text-gray-400 mx-1" />
            <DateInput
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 font-mono tabular-nums dark:text-white"
            />
            <span className="text-gray-400">إلى</span>
            <DateInput
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 font-mono tabular-nums dark:text-white"
            />
          </div>
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <DocumentChartBarIcon className="w-4 h-4" />
            إنشاء تقرير
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            تصدير CSV
          </button>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <p className="text-xs opacity-80">إجمالي الموظفين</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {overview.totalEmployees}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
              <CheckCircleIcon className="w-4 h-4" /> حاضر
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalPresent}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600 text-xs font-medium">
              <ClockIcon className="w-4 h-4" /> متأخر
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalLate}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
              <XCircleIcon className="w-4 h-4" /> غائب
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalAbsent}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium">
              <UserMinusIcon className="w-4 h-4" /> إجازة
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-gray-800 dark:text-white mt-1">
              {overview.totalOnLeave}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col justify-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الشركات المشمولة
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-gray-800 dark:text-white">
              {overview.totalCompanies}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedCompanyFilter}
              onChange={(e) => onCompanyFilterChange(e.target.value)}
              className="form-select w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">كل الشركات</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-40">
            <select
              value={sortBy}
              onChange={(e) =>
                onSortByChange(e.target.value as OwnerReportSortBy)
              }
              className="form-select w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="attendance">حسب الانضباط</option>
              <option value="name">حسب الاسم</option>
              <option value="company">حسب الشركة</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            طريقة العرض:
          </span>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => onViewModeChange("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              بطاقات
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <TableCellsIcon className="w-4 h-4" />
              جدول
            </button>
          </div>
          <div className="flex-1"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            عرض{" "}
            <span className="font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {filteredCount}
            </span>{" "}
            موظف
          </span>
        </div>
      </div>
    </>
  );
};
