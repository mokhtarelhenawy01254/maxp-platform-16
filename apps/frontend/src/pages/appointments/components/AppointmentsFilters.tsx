import React from "react";
import { AppointmentFilters } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface AppointmentsFiltersProps {
  filters: AppointmentFilters;
  onFilterChange: (filters: AppointmentFilters) => void;
  onResetFilters: () => void;
}

export const AppointmentsFilters: React.FC<AppointmentsFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الحالة
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            style={{ colorScheme: "dark" }}
          >
            <option
              value=""
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              جميع الحالات
            </option>
            <option
              value="pending"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              في الانتظار
            </option>
            <option
              value="confirmed"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              مؤكد
            </option>
            <option
              value="completed"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              مكتمل
            </option>
            <option
              value="cancelled"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              ملغي
            </option>
            <option
              value="no_show"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              لم يحضر
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الموظف
          </label>
          <select
            value={filters.staffId}
            onChange={(e) =>
              onFilterChange({ ...filters, staffId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            style={{ colorScheme: "dark" }}
          >
            <option
              value=""
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              جميع الموظفين
            </option>
            <option
              value="1"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              أحمد المدير
            </option>
            <option
              value="2"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              سارة المستشارة
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            النوع
          </label>
          <select
            value={filters.type}
            onChange={(e) =>
              onFilterChange({ ...filters, type: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            style={{ colorScheme: "dark" }}
          >
            <option
              value=""
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              جميع الأنواع
            </option>
            <option
              value="consultation"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              استشارة
            </option>
            <option
              value="training"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              تدريب
            </option>
            <option
              value="meeting"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              اجتماع
            </option>
            <option
              value="demo"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              عرض توضيحي
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            من تاريخ
          </label>
          <DateInput
            value={filters.dateFrom}
            onChange={(e) =>
              onFilterChange({ ...filters, dateFrom: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            إلى تاريخ
          </label>
          <DateInput
            value={filters.dateTo}
            onChange={(e) =>
              onFilterChange({ ...filters, dateTo: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={onResetFilters}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
        >
          إعادة تعيين
        </button>
      </div>
    </div>
  );
};
