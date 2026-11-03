import React from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { EmployeeOption, statusOptions } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface ManualAttendanceFiltersProps {
  showAllEmployees: boolean;
  setShowAllEmployees: (val: boolean) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  useDateRange: boolean;
  setUseDateRange: (use: boolean) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  employeeId: string;
  setEmployeeId: (id: string) => void;
  employees: EmployeeOption[];
  onReset: () => void;
}

export const ManualAttendanceFilters: React.FC<ManualAttendanceFiltersProps> = ({
  showAllEmployees,
  setShowAllEmployees,
  selectedDate,
  setSelectedDate,
  useDateRange,
  setUseDateRange,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  employeeId,
  setEmployeeId,
  employees,
  onReset,
}) => {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              id="showAllEmployees"
              checked={showAllEmployees}
              onChange={(e) => setShowAllEmployees(e.target.checked)}
              className="rounded border-gray-300 w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="showAllEmployees"
              className="text-sm font-medium cursor-pointer select-none"
            >
              عرض جميع الموظفين (حتى بدون سجلات حضور)
            </label>
            {showAllEmployees && (
              <span className="text-xs text-blue-600 dark:text-blue-400 mr-auto">
                يمكنك إنشاء سجلات حضور جديدة للموظفين
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">التاريخ:</span>
                <DateInput
                  
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[160px] font-mono tabular-nums text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useRange"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="rounded border-gray-300 cursor-pointer"
                />
                <label
                  htmlFor="useRange"
                  className="text-sm select-none cursor-pointer"
                >
                  فترة زمنية
                </label>
              </div>

              {useDateRange && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                  <span className="text-sm font-medium">إلى:</span>
                  <DateInput
                    
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px] font-mono tabular-nums text-sm"
                    min={selectedDate}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={employeeId || "all"}
                onValueChange={(value) =>
                  setEmployeeId(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue
                    placeholder={
                      employees.length > 0 ? "اختر موظف" : "لا يوجد موظفين"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    الكل ({employees.length} موظف)
                  </SelectItem>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}{" "}
                        {emp.employeeNumber ? `(${emp.employeeNumber})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-employees" disabled>
                      لا يوجد موظفين نشطين
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={onReset}
                className="px-3"
                title="إعادة تعيين الفلاتر"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
