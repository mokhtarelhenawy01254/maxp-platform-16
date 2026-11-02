import React from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "../../components/ui/button";
import ThemeToggle from "../../components/ui/theme-toggle";
import { DateInput } from '../../components/ui/DateInput';

interface ReportsPageHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
}

export const ReportsPageHeader: React.FC<ReportsPageHeaderProps> = ({
  selectedDate,
  onDateChange,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          التقارير والتحليلات
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          تقارير مفصلة عن أداء النظام
        </p>
      </div>
      <div className="flex items-center space-x-2 space-x-reverse self-end sm:self-auto">
        <ThemeToggle />
        <DateInput
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
        />
        <Button
          onClick={onRefresh}
          variant="outline"
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs sm:text-sm"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>
    </div>
  );
};
